#!/usr/bin/env python3
"""Cập nhật file JSON config (src/models/configs/*.json) từ thông số khớp
trong file URDF chuẩn Robotics (ROS).

Script chỉ dùng thư viện chuẩn Python (không cần cài thêm gói), khớp mỗi
joint trong JSON với joint cùng tên trong URDF rồi ghi đè: axis, limits
(lower/upper/effort/velocity), type, dynamics, mimic.

Cách dùng:
    python scripts/update_config_from_urdf.py <file.urdf> <config.json>
    python scripts/update_config_from_urdf.py <file.urdf> <config.json> -o <output.json>
    python scripts/update_config_from_urdf.py <file.urdf> <config.json> --map map.json --dry-run

File mapping (--map, tùy chọn) dùng khi tên joint trong JSON không trùng
tên joint trong URDF (vd: 2 khớp cổ tay dùng chung 1 node "wrist_pivot"),
định dạng:
    {
      "wrist_pivot|Gập": "wrist_flex_joint",
      "wrist_pivot|Xoay": "wrist_rotate_joint",
      "thumb_cmc_mount": "thumb_cmc_joint"
    }
Khóa có thể là "<name>" hoặc "<name>|<label>" (ưu tiên khóa có "|<label>").
"""

import argparse
import json
import math
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

RAD2DEG = 180.0 / math.pi


def _num(text, default=0.0):
    try:
        return float(text)
    except (TypeError, ValueError):
        return default


def _clean_number(value, precision):
    """Làm tròn và trả về int nếu giá trị là số nguyên, tránh 90.0 -> 90."""
    rounded = round(value, precision)
    if abs(rounded - round(rounded)) < 1e-9:
        return int(round(rounded))
    return rounded


def parse_urdf(urdf_path):
    """Trả về dict: joint_name -> thông tin khớp lấy từ URDF."""
    tree = ET.parse(urdf_path)
    root = tree.getroot()

    joints = {}
    for joint_el in root.findall("joint"):
        name = joint_el.get("name")
        if not name:
            continue

        info = {"type": joint_el.get("type", "revolute")}

        axis_el = joint_el.find("axis")
        if axis_el is not None and axis_el.get("xyz"):
            parts = axis_el.get("xyz").split()
            if len(parts) == 3:
                info["axis"] = [_num(p) for p in parts]

        limit_el = joint_el.find("limit")
        if limit_el is not None:
            limit = {}
            if limit_el.get("lower") is not None:
                limit["lower"] = _num(limit_el.get("lower"))
            if limit_el.get("upper") is not None:
                limit["upper"] = _num(limit_el.get("upper"))
            if limit_el.get("effort") is not None:
                limit["effort"] = _num(limit_el.get("effort"))
            if limit_el.get("velocity") is not None:
                limit["velocity"] = _num(limit_el.get("velocity"))
            info["limit"] = limit

        dynamics_el = joint_el.find("dynamics")
        if dynamics_el is not None:
            dynamics = {}
            if dynamics_el.get("damping") is not None:
                dynamics["damping"] = _num(dynamics_el.get("damping"))
            if dynamics_el.get("friction") is not None:
                dynamics["friction"] = _num(dynamics_el.get("friction"))
            info["dynamics"] = dynamics

        mimic_el = joint_el.find("mimic")
        if mimic_el is not None and mimic_el.get("joint"):
            info["mimic"] = {
                "joint": mimic_el.get("joint"),
                "multiplier": _num(mimic_el.get("multiplier"), 1.0),
                "offset": _num(mimic_el.get("offset"), 0.0),
            }

        joints[name] = info

    return joints


def resolve_urdf_joint_name(json_joint, mapping):
    name = json_joint.get("name")
    label = json_joint.get("label")
    if mapping:
        if label and f"{name}|{label}" in mapping:
            return mapping[f"{name}|{label}"]
        if name in mapping:
            return mapping[name]
    return name


def update_joint(json_joint, urdf_info, precision):
    """Ghi đè json_joint bằng dữ liệu từ urdf_info. Trả về list mô tả thay đổi."""
    changes = []
    urdf_type = urdf_info.get("type", "revolute")
    json_type = "prismatic" if urdf_type == "prismatic" else "revolute"
    if json_joint.get("type") != json_type:
        changes.append(f'type: {json_joint.get("type")!r} -> {json_type!r}')
        json_joint["type"] = json_type

    if "axis" in urdf_info:
        axis = [_clean_number(v, 6) for v in urdf_info["axis"]]
        if json_joint.get("axis") != axis:
            changes.append(f'axis: {json_joint.get("axis")} -> {axis}')
            json_joint["axis"] = axis

    limit = urdf_info.get("limit")
    if limit:
        limits = dict(json_joint.get("limits") or {})
        is_angular = urdf_type in ("revolute", "continuous")

        for src_key, dst_key in (("lower", "lower"), ("upper", "upper")):
            if src_key in limit:
                raw = limit[src_key]
                value = _clean_number(raw * RAD2DEG if is_angular else raw, precision)
                if limits.get(dst_key) != value:
                    changes.append(f'limits.{dst_key}: {limits.get(dst_key)} -> {value}')
                    limits[dst_key] = value

        for key in ("effort", "velocity"):
            if key in limit:
                value = _clean_number(limit[key], precision)
                if limits.get(key) != value:
                    changes.append(f'limits.{key}: {limits.get(key)} -> {value}')
                    limits[key] = value

        json_joint["limits"] = limits

    dynamics = urdf_info.get("dynamics")
    if dynamics:
        cleaned = {k: _clean_number(v, precision) for k, v in dynamics.items()}
        if json_joint.get("dynamics") != cleaned:
            changes.append(f'dynamics: {json_joint.get("dynamics")} -> {cleaned}')
            json_joint["dynamics"] = cleaned

    mimic = urdf_info.get("mimic")
    if mimic:
        cleaned = {
            "joint": mimic["joint"],
            "multiplier": _clean_number(mimic["multiplier"], precision),
            "offset": _clean_number(mimic["offset"], precision),
        }
        if json_joint.get("mimic") != cleaned:
            changes.append(f'mimic: {json_joint.get("mimic")} -> {cleaned}')
            json_joint["mimic"] = cleaned

    return changes


def update_config(config, urdf_joints, mapping, precision):
    matched, unmatched = [], []

    for finger in config.get("fingers", []):
        for joint in finger.get("joints", []):
            urdf_name = resolve_urdf_joint_name(joint, mapping)
            urdf_info = urdf_joints.get(urdf_name)
            if urdf_info is None:
                unmatched.append(f'{finger.get("key")}.{joint.get("name")} (label={joint.get("label")!r})')
                continue
            changes = update_joint(joint, urdf_info, precision)
            matched.append((f'{finger.get("key")}.{joint.get("name")} <- urdf:{urdf_name}', changes))

    return matched, unmatched


def format_json(obj, indent=0):
    """Pretty-print JSON giữ phong cách của config gốc: mỗi joint trên 1 dòng."""
    pad, pad2 = "  " * indent, "  " * (indent + 1)

    if isinstance(obj, dict):
        if not obj:
            return "{}"
        items = [f'{pad2}"{k}": {format_json(v, indent + 1)}' for k, v in obj.items()]
        return "{\n" + ",\n".join(items) + "\n" + pad + "}"

    if isinstance(obj, list):
        if not obj:
            return "[]"
        if all(isinstance(x, dict) and "name" in x for x in obj):
            lines = [pad2 + json.dumps(x, ensure_ascii=False) for x in obj]
            return "[\n" + ",\n".join(lines) + "\n" + pad + "]"
        items = [pad2 + format_json(x, indent + 1) for x in obj]
        return "[\n" + ",\n".join(items) + "\n" + pad + "]"

    return json.dumps(obj, ensure_ascii=False)


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("urdf", type=Path, help="File .urdf nguồn")
    parser.add_argument("config", type=Path, help="File JSON config cần cập nhật (src/models/configs/*.json)")
    parser.add_argument("-o", "--output", type=Path, default=None, help="File JSON output (mặc định: ghi đè config)")
    parser.add_argument("--map", type=Path, default=None, help="File JSON mapping tên khớp JSON -> tên khớp URDF")
    parser.add_argument("--precision", type=int, default=2, help="Số chữ số thập phân làm tròn (mặc định 2)")
    parser.add_argument("--dry-run", action="store_true", help="Chỉ in ra thay đổi, không ghi file")
    args = parser.parse_args()

    if not args.urdf.exists():
        sys.exit(f"Không tìm thấy file URDF: {args.urdf}")
    if not args.config.exists():
        sys.exit(f"Không tìm thấy file config JSON: {args.config}")

    mapping = {}
    if args.map:
        if not args.map.exists():
            sys.exit(f"Không tìm thấy file mapping: {args.map}")
        mapping = json.loads(args.map.read_text(encoding="utf-8"))

    urdf_joints = parse_urdf(args.urdf)
    config = json.loads(args.config.read_text(encoding="utf-8"))

    matched, unmatched = update_config(config, urdf_joints, mapping, args.precision)

    changed_count = 0
    for path, changes in matched:
        if changes:
            changed_count += 1
            print(f"[OK] {path}")
            for c in changes:
                print(f"       {c}")

    if unmatched:
        print("\n[WARN] Không khớp được joint nào trong URDF cho:")
        for u in unmatched:
            print(f"       {u}")
        print("       -> dùng --map để chỉ định tên joint URDF tương ứng.")

    print(f"\nTổng: {changed_count}/{len(matched)} joint được cập nhật, {len(unmatched)} joint không khớp.")

    if args.dry_run:
        print("\n(dry-run) Không ghi file.")
        return

    output_path = args.output or args.config
    output_path.write_text(format_json(config) + "\n", encoding="utf-8")
    print(f"\nĐã ghi: {output_path}")


if __name__ == "__main__":
    main()
