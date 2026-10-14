# func[2137] dispatcher — input delivery report

Offsets verified from raw bytes (`wasm-objdump` prints memarg offsets in decimal). *Inferred* = naming only.

## 1. Event struct (40 bytes; callers build an 80-byte scratch, temp record at +40..+79, shuffled to +0..+39)

| Off | Type | Meaning |
|---|---|---|
| +0 | i32 | **type/tag**, copied by `i64.load 3 40 / i64.store 3 0`: 3=wheel (b0ac83), 4=sync (b0acfc), 1=move (b0ad72), 0=key (b0adfb), 2=button (b0ae7d) |
| +8 | i64 | **timeMs** (`i64.store 3 8`, b0acad/b0ada3/b0ae25/b0aea7; sync uses `v128.load 3 48 / v128.store 3 8`) |
| +16 | i32 | payload 0: key code / button index / wheel steps / 0 for move |
| +20 | f32 | move: x (`f32.store 2 60`→copied `i64.load 3 56 / i64.store 3 16`) |
| +24 | f32 | move: y (`f32.store 2 64`→`i64.load 3 64 / i64.store 3 24`) |
| +28 | u8 | key/button: pressed; move: relative (`i32.store8 0 68`, carried by the +64→+24 8-byte copy) |
| +32 | i64/f64 | **input 0; output slot** — the dispatcher overwrites it (1544f1 `f64.store 3 32`) with the scheduled time before queueing |
| +4..+7 | — | undefined (copy of never-written scratch) |

**timeMs is not used inside func[2137]**. The event pointer (`local 1`) is only passed to the two immediate `call_indirect`s (15439a, 15447c) and copied wholesale into the deque (1549c1 `i64.load 3 32`, 1549cd/1549d9 `v128.load 3 16 / 3 0`). No load of event+8 exists. *Inferred:* the obj+4 callee consumes timeMs.

## 2. Decision rule

Object (deque) fields: +20 map base, +24 map end, +32 front index, +36 **element count**; +40 f64; +48 timer handle.

```
154332  call_indirect 0 (type 35)      -> clock (f64), vtable slot obj+0
15433f  f64.load 3 40 / 15434e br_if 0 : if (A=obj+40) < 0 skip
154350..154373  t = floor((clock - A + (-300000)) / 1000) + 1
154381  br_if 0                         : if (!(t > 0)) skip
154385  i32.load 2 36 -> local4         ; delay=t; br 1  (15438e)
154393  i32.load 2 36 -> local4
154398  br_if 0                         : if (count != 0) -> enqueue path
15439a-1543a1  dispatch(event) via obj+4, call_indirect 0 (type 0); br 1 (return)
```

* **Immediate dispatch** iff `obj+36 == 0` **and** NOT(`obj+40 >= 0` and `t > 0`), i.e. `count == 0 && (A < 0 || clock < A + 300000)`.
* **Enqueue** otherwise: `(A >= 0 && clock >= A+300000) || count != 0`. A second check then runs: `1543a7 local.get 4; 1543a9 i32.const 4096; 1543ac i32.ge_u; 1543ad if` → flush (below), then dispatch the incoming event immediately (15447c-154483) and return.

## 3. The +40 f64 and the arithmetic

A = f64 at obj+40 is tested `f64.lt` against 0.0 (15434d) and `f64.sub`-tracted from the clock (154354). The constant is **−300000.0** (`f64.const -0x1.24f8p+18`, 154355; `f64.add` 15435e) — it is *subtracted*, not added: `t = floor((clock − A − 300000)/1000) + 1 = floor((clock − A)/1000) − 299`. `/1000` converts ms→s; `−300000` = a 300 s look-back. `t > 0` ⟺ `clock >= A + 300000`. The value becomes `delay` (local 18); `local17 = clock + delay` (154489-15448e) is the new element's timestamp `max(clock+delay, backTime)` (1544e3, 1544ef `f64.lt`, 1544f0 `select`, 1544f1 `f64.store 3 32`) — it schedules/orders the queued event; the flush branch ignores it.

`call_indirect 0 (type 35)` at 154332 (`local.get 0; i32.load 2 0; call_indirect...; local.set 19`, local 19 f64; reused arg-less at 154a36) is a **no-argument virtual returning f64** — *inferred:* `double now()` in ms, same unit as the deque stamps.

## 4. Deque element (40 bytes, block size 102 = 4096/40)

Bytes 0..31 are a verbatim copy of the event; **+32 is the f64 time** (`i64.load 3 32 / i64.store 3 32`, 1549c3/1549c6). It *is* compared with the virtual clock, but only for the **front** element when arming the timer: `154a2e f64.load 3 32`, `154a36 call_indirect 0 (type 35)`, `154a39 f64.sub` → `d = frontTime − clock`, clamped `(d>0)?d:0` (154a47-154a51), passed to the obj+8 virtual (154a56 `call_indirect 0 (type 65)`, stacked args `obj, 5900, delay, obj`; result → obj+48). The back element's stamp is compared at 1544ef.

## 5. Drain (pop loop)

Trigger: only `obj+36 >= 4096u` on the enqueue path (1543a7-1543ad). First, if obj+48 != 0: `call obj+12(obj+48)`, `obj+48 = 0` (1543b1-1543c8). Then loop 1543d6: address = `map[obj32/102] + (obj32%102)*40`, copied into a 40-byte temp (`i64.store 3 40`, `v128.store 3 24 / 3 8`); `obj32 += 1` (15442b); `obj36 -= 1` (154435); if `obj32 >= 204` → `call 531(map[0])`, `obj20 += 4`, `obj32 -= 102` (154438-154460); then **dispatch the copy**: `154464 local.get 9; i32.const 8; i32.add; 154469 i32.load 2 4; 15446e call_indirect 0 (type 0)`; repeat while `obj36 != 0` (`br_if 0`, 154478). It pops **all** pending elements — none dropped — with **no clock comparison** in the loop.

## 6. `call` targets in func[2137] (dispatch is never a direct `call`)

* `call 531` ×7 — 154445, 1546c4, 154774, 1547e8, 154941, 154970, 154983 — free (block or old map).
* `call 532` ×6 — 154584, 1545d4, 154727, 15473a, 15476d, 15486a — allocate(n): 4080 (=102×40 block), nBlocks×4 (map), 4.
* `call 1451` ×2 — 154557, 1546fe — deque growth helper `(obj+16, &temp)`.
* `call 660` ×2 — 15478e, 15485a — throw helper before `unreachable` (libc++ try/catch_all paths).

`call_indirect`: 154332/154a36 type 35 = clock; 1543a1/15446e/154483 type 0 via obj+4 = event dispatch; 1543c1 type 0 via obj+12 = timer release; 154a56 type 65 via obj+8 = arm timer.
