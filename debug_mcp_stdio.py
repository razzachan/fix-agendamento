import json
import subprocess
import sys
import time
import threading
from pathlib import Path

def send_mcp_initialize(proc: subprocess.Popen, protocol_version: str = "2025-06-18") -> None:
    msg = {
        "jsonrpc": "2.0",
        "id": 0,
        "method": "initialize",
        "params": {
            "protocolVersion": protocol_version,
            "capabilities": {
                "extensions": {
                    "io.modelcontextprotocol/ui": {
                        "mimeTypes": ["text/html;profile=mcp-app"]
                    }
                }
            },
            "clientInfo": {"name": "debug-client", "version": "0.0.0"},
        },
    }
    # NOTE: The python mcp stdio transport is newline-delimited JSON (one JSON-RPC per line)
    payload = (json.dumps(msg, separators=(",", ":")) + "\n").encode("utf-8")
    assert proc.stdin is not None
    proc.stdin.write(payload)
    proc.stdin.flush()

def _read_some(stream, max_bytes: int, out: dict) -> None:
    try:
        out["data"] = stream.read(max_bytes)  # blocks until bytes or EOF
    except Exception as e:
        out["err"] = repr(e)


def read_first_stdout(proc: subprocess.Popen, timeout_s: float = 3.0, max_bytes: int = 65536) -> bytes:
    assert proc.stdout is not None
    out: dict = {}
    t = threading.Thread(target=_read_some, args=(proc.stdout, max_bytes, out), daemon=True)
    t.start()
    t.join(timeout=timeout_s)
    if t.is_alive():
        return b""
    return out.get("data", b"") or b""


def try_parse_first_mcp_body(data: bytes) -> bytes:
    # Newline-delimited JSON: return first line if present.
    if b"\n" not in data:
        return b""
    line = data.split(b"\n", 1)[0].strip()
    return line

def run_one(name: str, venv_python: str, server_main: str) -> int:
    print(f"\n=== {name} ===")
    cmd = [venv_python, "-u", server_main]
    proc = subprocess.Popen(
        cmd,
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        cwd=str(Path(server_main).parent),
    )
    try:
        send_mcp_initialize(proc)
        raw = read_first_stdout(proc, timeout_s=3.0)
        if not raw:
            print("stdout: (no bytes within timeout)")
        else:
            body = try_parse_first_mcp_body(raw)
            if body:
                print("stdout body:", body.decode("utf-8", errors="replace"))
            else:
                # Either garbage on stdout or incomplete header/body
                preview = raw[:500]
                print("stdout raw (first bytes):", preview.decode("utf-8", errors="replace"))

        time.sleep(0.5)

        rc = proc.poll()
        if rc is None:
            print("process: still running")
        else:
            print("process: exited", rc)

        err = b""
        try:
            # Non-blocking-ish: read what's available after short wait
            time.sleep(0.2)
            if proc.stderr is not None:
                # If process is still running, don't block forever.
                if proc.poll() is not None:
                    err = proc.stderr.read() or b""
        except Exception:
            pass
        if err:
            print("stderr:\n", err.decode("utf-8", errors="replace"))
        else:
            print("stderr: (empty)")

        return 0
    finally:
        if proc.poll() is None:
            proc.terminate()
            try:
                proc.wait(timeout=2)
            except Exception:
                proc.kill()

if __name__ == "__main__":
    # Default targets from your current setup
    targets = [
        (
            "whatsapp-agendamento",
            r"C:\Users\akrom\whatsapp-mcp\whatsapp-mcp-server\.venv\Scripts\python.exe",
            r"C:\Users\akrom\whatsapp-mcp\whatsapp-mcp-server\main.py",
        ),
        (
            "whatsapp-gestao",
            r"C:\Users\akrom\whatsapp-mcp-2\whatsapp-mcp-server\.venv\Scripts\python.exe",
            r"C:\Users\akrom\whatsapp-mcp-2\whatsapp-mcp-server\main.py",
        ),
    ]

    ok = 0
    for name, py, main in targets:
        ok |= run_one(name, py, main)

    sys.exit(ok)
