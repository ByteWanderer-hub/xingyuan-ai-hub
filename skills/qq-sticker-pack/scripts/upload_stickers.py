# -*- coding: utf-8 -*-
"""批量把表情 PNG 上架到 QQ 收藏表情（SnowLuma / NapCat OneBot HTTP API）。

比 PowerShell 版更稳：不受 PowerShell 5.1 的 ANSI/BOM 解析影响，中文备注不会乱码。

用法：
    python upload_stickers.py --dir D:\\qqbot\\stickers2 \
                              --config D:\\qqbot\\qq-bridge\\config.json \
                              --caption shock=震惊 --caption yay=好耶

不给 --caption 时用文件名当备注。
"""
import argparse
import base64
import json
import pathlib
import sys
import time
import urllib.request


def call(base, action, payload, token):
    body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    req = urllib.request.Request(
        f"{base}/{action}", data=body,
        headers={"Content-Type": "application/json", "Authorization": "Bearer " + token})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read().decode("utf-8"))


def count(base, token):
    # 必须发 {}：传 {"count":N} 会返回空数组
    data = call(base, "fetch_custom_face_detail", {}, token)
    items = data.get("data") or []
    return len(items) if isinstance(items, list) else -1


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dir", required=True, help="PNG 目录")
    ap.add_argument("--config", required=True, help="qq-bridge 的 config.json")
    ap.add_argument("--base", default="http://127.0.0.1:3000")
    ap.add_argument("--caption", action="append", default=[],
                    help="文件名(不含扩展名)=备注，可重复")
    args = ap.parse_args()

    cfg = json.loads(pathlib.Path(args.config).read_text(encoding="utf-8"))
    token = cfg["snowluma"]["accessToken"]
    caps = dict(c.split("=", 1) for c in args.caption)

    before = count(args.base, token)
    print(f"上传前收藏数: {before}")

    pngs = sorted(pathlib.Path(args.dir).glob("*.png"))
    if not pngs:
        sys.exit(f"{args.dir} 下没有 PNG")

    ok = fail = 0
    for png in pngs:
        key = png.stem
        b64 = base64.b64encode(png.read_bytes()).decode("ascii")
        res = call(args.base, "add_custom_face", {"file": "base64://" + b64}, token)
        eid = ((res.get("data") or {}).get("emoji_id") or "")
        print(f"{key:<10} -> {res.get('status')}/{res.get('retcode')}  emoji_id={eid[:34]}")
        if not eid:
            fail += 1
            continue
        ok += 1
        desc = (caps.get(key) or key)[:20]
        try:
            call(args.base, "modify_custom_face", {"emoji_id": eid, "desc": desc}, token)
            print(f"           备注 {desc}")
        except Exception as e:  # noqa: BLE001
            print(f"           备注失败: {e}")
        time.sleep(0.4)

    time.sleep(2)
    after = count(args.base, token)
    print(f"上传后收藏数: {after}（增加 {after - before}）；成功 {ok}，失败 {fail}")
    if after <= before:
        # 同图会被 QQ 去重，数量不变不一定是失败
        print("提示：数量没增加——可能是图片内容重复（QQ 去重），或 token/网关卡住", file=sys.stderr)


if __name__ == "__main__":
    main()
