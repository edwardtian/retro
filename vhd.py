#!/usr/bin/env python3
"""VHD helpers for the workshop: differencing children and fixed images.

A "differencing" VHD (disk type 4) starts out empty: every block is unallocated
(BAT entry 0xFFFFFFFF), so all reads come from the parent image, and the
emulator writes only the blocks a game actually changes into the child. That is
what makes a per-game export small, and it is the same layout the original site
ships for StarCraft (`win95_en.vhd` parent + `sysddiff.vhd` child).

Layout written here (VHD spec, 2 MiB blocks):

    offset 0     512   footer copy (identical to the footer at the end)
    offset 512   1024  dynamic disk header ("cxsparse") + parent locator
    offset 1536  ...   block allocation table, one 4-byte entry per block
    end          512   footer

The parent is referenced twice, as the spec requires: by unique id and
timestamp in the dynamic header, and by name in the parent locator entry
(relative name, code "Wi2r"). The parent file must sit next to the child under
that exact name, which is how the player's flow extracts them.
"""

import os
import shutil
import struct
import subprocess
import time

VHD_COOKIE = b"conectix"
VHD_DYN_COOKIE = b"cxsparse"
VHD_BLOCK = 2 * 1024 * 1024          # 2 MiB, the spec default
VHD_HEADS = 16
VHD_SECTORS_PER_TRACK = 63
VHD_DIFFERENCING = 4
VHD_FIXED = 2


def _checksum(block):
    return (~sum(block)) & 0xFFFFFFFF


def geometry(size):
    total_sectors = size // 512
    cylinders = min(total_sectors // (VHD_HEADS * VHD_SECTORS_PER_TRACK), 65535)
    return cylinders, VHD_HEADS, VHD_SECTORS_PER_TRACK


def read_footer(path):
    """Return the parsed footer of a VHD, or None if the file is not one."""
    size = os.path.getsize(path)
    if size < 512:
        return None
    with open(path, "rb") as handle:
        handle.seek(-512, os.SEEK_END)
        footer = handle.read(512)
    if footer[0:8] != VHD_COOKIE:
        return None
    data_offset, = struct.unpack_from(">Q", footer, 16)
    original, current = struct.unpack_from(">QQ", footer, 40)
    disk_type, = struct.unpack_from(">I", footer, 60)
    timestamp, = struct.unpack_from(">I", footer, 24)
    return {
        "footer": footer,
        "data_offset": data_offset,
        "disk_type": disk_type,
        "original_size": original,
        "current_size": current,
        "timestamp": timestamp,
        "unique_id": footer[68:84],
    }


def footer(size, unique_id, disk_type, parent=None):
    cylinders, heads, sectors = geometry(size)
    block = bytearray(512)
    block[0:8] = VHD_COOKIE
    struct.pack_into(">I", block, 8, 0x00000002)          # features: reserved
    struct.pack_into(">I", block, 12, 0x00010000)         # file format version
    # Differencing and dynamic disks point at the 1024-byte header at 512;
    # fixed disks have no header, which the spec spells as all-ones.
    struct.pack_into(">Q", block, 16, 512 if parent is not None or disk_type != VHD_FIXED
                     else 0xFFFFFFFFFFFFFFFF)
    struct.pack_into(">I", block, 24, int(time.time()) - 946684800)
    block[28:32] = b"win "
    struct.pack_into(">I", block, 32, 0x000A0000)
    block[36:40] = b"Wi2k"
    struct.pack_into(">Q", block, 40, size)               # original size
    struct.pack_into(">Q", block, 48, size)               # current size
    struct.pack_into(">I", block, 56, (cylinders << 16) | (heads << 8) | sectors)
    struct.pack_into(">I", block, 60, disk_type)
    block[68:84] = unique_id
    struct.pack_into(">I", block, 64, _checksum(block))
    return bytes(block)


def dynamic_header(table_offset, total_blocks, parent=None):
    header = bytearray(1024)
    header[0:8] = VHD_DYN_COOKIE
    struct.pack_into(">Q", header, 8, 0xFFFFFFFFFFFFFFFF)  # unused
    struct.pack_into(">Q", header, 16, table_offset)
    struct.pack_into(">I", header, 24, total_blocks)
    struct.pack_into(">I", header, 28, VHD_BLOCK)
    if parent is not None:
        header[36:52] = parent["unique_id"]                # parent unique id
        struct.pack_into(">I", header, 52, parent["timestamp"])
        name = parent["name"].encode("utf-16-be")[:510]
        header[60:60 + len(name)] = name                   # parent unicode name
        # Parent locator entry: platform code "Wi2r" (relative path), 1024 bytes
        # of platform data space holding the UTF-16BE name, placed right after
        # the header.
        data = parent["name"].encode("utf-16-be")
        struct.pack_into(">4sIII", header, 572, b"Wi2r", 1024, len(data), 0)
        struct.pack_into(">I", header, 572 + 16, 2048 + total_blocks * 4)
    struct.pack_into(">I", header, 32, _checksum(header))
    return bytes(header)


def write_differencing_vhd(parent_path, child_path, parent_name=None):
    """Create an empty differencing child of parent_path."""
    parent = read_footer(parent_path)
    if parent is None:
        raise ValueError(f"{parent_path} is not a VHD (no conectix footer)")
    size = parent["current_size"]
    parent_name = parent_name or os.path.basename(parent_path)
    total_blocks = max(1, (size + VHD_BLOCK - 1) // VHD_BLOCK)
    table_offset = 1536
    locator_offset = 2048 + total_blocks * 4               # platform data area
    parent_info = dict(parent, name=parent_name)

    table = bytearray(b"\xff" * (total_blocks * 4))        # nothing allocated yet
    unique_id = os.urandom(16)
    with open(child_path, "wb") as out:
        out.write(footer(size, unique_id, VHD_DIFFERENCING, parent=parent_info))
        out.write(dynamic_header(table_offset, total_blocks, parent=parent_info))
        out.write(bytes(table))
        # platform data for the parent locator entry (UTF-16BE name)
        out.seek(locator_offset)
        out.write(parent_name.encode("utf-16-be"))
        end = max(locator_offset + 1024, table_offset + len(table))
        out.seek(end)
        out.write(footer(size, unique_id, VHD_DIFFERENCING, parent=parent_info))
        out.truncate(end + 512)
    return {
        "child": child_path,
        "parent": parent_path,
        "parent_name": parent_name,
        "size": size,
        "blocks": total_blocks,
        "bytes": os.path.getsize(child_path),
    }


def write_fixed_vhd(path, size, sparse=True):
    """Create a fixed VHD of `size` bytes (zeros + footer)."""
    unique_id = os.urandom(16)
    with open(path, "wb") as out:
        remaining = size
        chunk = b"\x00" * (8 << 20)
        while remaining > 0:
            piece = min(remaining, len(chunk))
            out.write(chunk[:piece])
            remaining -= piece
        out.write(footer(size, unique_id, VHD_FIXED))
    if sparse:
        try:
            os.truncate(path, os.path.getsize(path))       # keep it sparse on disk
        except OSError:
            pass
    return {"path": path, "size": size, "bytes": os.path.getsize(path)}


def _chs_bytes(lba, heads=VHD_HEADS, sectors_per_track=VHD_SECTORS_PER_TRACK):
    """CHS encoding used in a partition table entry."""
    cylinder = min(lba // (heads * sectors_per_track), 1023)
    head = (lba // sectors_per_track) % heads
    sector = (lba % sectors_per_track) + 1
    return bytes([head & 0xFF, (sector & 0x3F) | ((cylinder >> 2) & 0xC0), cylinder & 0xFF])


def format_fat32(image_path, label="SYSTEM", partition_lba=63):
    """Partition and format a blank fixed VHD in place.

    An all-zero disk has no partition table, and DOSBox-X then cannot derive a
    drive geometry for `imgmount c` - the mount fails and the guest sees no C:
    at all. Giving the disk a normal MBR plus one active FAT32 partition fixes
    that, and also saves the installer from having to run FDISK/FORMAT.
    """
    if shutil.which("mkfs.vfat") is None:
        raise RuntimeError("mkfs.vfat (dosfstools) is required to format a blank disk")
    if read_footer(image_path) is None:
        raise ValueError(f"{image_path} is not a VHD")
    disk_bytes = os.path.getsize(image_path) - 512          # footer
    total_sectors = disk_bytes // 512
    partition_sectors = total_sectors - partition_lba
    if partition_sectors < 64 * 1024:
        raise ValueError("disk is too small to format")
    blocks = (partition_sectors * 512) // 1024
    fat = 32 if blocks >= (260 * 1024) else 16              # FAT32 needs ~260 MB
    command = ["mkfs.vfat", "-F", str(fat), "-n", label, "-g",
               f"{VHD_HEADS}/{VHD_SECTORS_PER_TRACK}", "-h", str(partition_lba),
               "-s", "8", "-I", "--offset", str(partition_lba), image_path, str(blocks)]
    result = subprocess.run(command, capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError("mkfs.vfat failed: " + (result.stderr or result.stdout).strip())

    mbr = bytearray(512)
    entry = 446
    mbr[entry] = 0x80                                       # active
    mbr[entry + 1:entry + 4] = _chs_bytes(partition_lba)
    mbr[entry + 4] = 0x0C if fat == 32 else 0x0E            # FAT32 LBA / FAT16 LBA
    mbr[entry + 5:entry + 8] = _chs_bytes(partition_lba + partition_sectors - 1)
    struct.pack_into("<II", mbr, entry + 8, partition_lba, partition_sectors)
    mbr[510:512] = b"\x55\xaa"
    with open(image_path, "r+b") as handle:
        handle.seek(0)
        handle.write(bytes(mbr))
    return {"partition_lba": partition_lba, "partition_sectors": partition_sectors,
            "fat": fat, "label": label}


def imgmount_geometry(image_path):
    """The `-size bps,spc,hpc,cyl` argument for this image.

    Passing it explicitly means a mount never depends on DOSBox-X guessing the
    geometry from the image contents.
    """
    parsed = read_footer(image_path)
    size = parsed["current_size"] if parsed else os.path.getsize(image_path)
    cylinders, heads, sectors = geometry(size)
    return f"512,{heads * sectors},{heads},{cylinders}"


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="VHD helpers (differencing children, fixed images)")
    sub = parser.add_subparsers(dest="command", required=True)
    link = sub.add_parser("link", help="create a differencing child of a parent VHD")
    link.add_argument("parent")
    link.add_argument("child")
    blank = sub.add_parser("blank", help="create a fixed (blank) VHD")
    blank.add_argument("path")
    blank.add_argument("size", help="e.g. 2G")
    info = sub.add_parser("info", help="print a VHD's footer fields")
    info.add_argument("path")
    fmt = sub.add_parser("format", help="partition and format a blank VHD")
    fmt.add_argument("path")
    fmt.add_argument("--label", default="SYSTEM")
    args = parser.parse_args()

    if args.command == "link":
        print(write_differencing_vhd(args.parent, args.child))
    elif args.command == "blank":
        suffix = args.size[-1].upper()
        scale = {"K": 1024, "M": 1024 ** 2, "G": 1024 ** 3, "T": 1024 ** 4}.get(suffix, 1)
        total = int(args.size[:-1]) * scale if suffix in "KMGT" else int(args.size)
        print(write_fixed_vhd(args.path, total))
    elif args.command == "format":
        print(format_fat32(args.path, args.label))
    else:
        parsed = read_footer(args.path)
        if parsed is None:
            raise SystemExit("not a VHD")
        names = {2: "fixed", 3: "dynamic", 4: "differencing"}
        print({k: (v.hex() if isinstance(v, bytes) else v) for k, v in parsed.items()
               if k != "footer"})
        print("disk type:", names.get(parsed["disk_type"], parsed["disk_type"]))
