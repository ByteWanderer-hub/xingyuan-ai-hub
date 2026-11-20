---
name: game-feel
description: >
  Add "juice" and game feel that makes actions satisfying — screen shake, hit-stop/freeze
  frames, tweened/eased motion, squash & stretch, knockback, and layered audio-visual
  feedback — as engine-neutral techniques that pair with the detected engine's tween,
  particle, and camera APIs. Use when the user mentions game feel, juice, "make it feel
  good/punchy", screen shake, hit stop, screen freeze, easing, squash and stretch, impact
  frames, or feedback/polish on hits, jumps, pickups, and deaths. Also use for
  游戏体感、视觉反馈、预警反馈、开源动效节奏拆解、保持元素不变只改节奏，或从游戏视频分析可读性与反馈编排；基于时间点证据
  提炼方法，不把录像分析冒充输入延迟测量、玩法实现或原作素材复刻。
---

# Game feel (juice)

> 本文中的其他引擎/类型技能名称是外部参考，不代表本库已安装。先通过 `xingyuan-router` 核对实际技能；缺失时报告缺口，按当前平台已核实 API 推进可执行部分。Godot/Unity 示例不能直接当作千星 API。


The difference between a mechanic that *works* and one that feels *good* is feedback: the
layered, slightly-exaggerated response an action provokes. This skill covers the engine-
neutral techniques — screen shake, hit-stop, easing, squash & stretch, knockback, and stacked
feedback — and tells you how to apply them without burying the underlying simulation. It
**adds polish on top of** an existing mechanic; it does not implement the mechanic.

## When to use

- Use when an action (hit, jump, dash, pickup, death, button press) is mechanically correct
  but feels weak, weightless, or unsatisfying, and you want it to feel responsive and punchy.
- Use to add screen shake, hit-stop/freeze frames, eased motion, squash & stretch, knockback,
  flashes, or to layer multiple feedback channels onto one event.
- Use to decide *how much* juice is enough and where it crosses into noise.

**When *not* to use:** for the raw controller math (jump height, coyote time) use the
`platformer` genre and the engine movement skill. For camera *follow/deadzone/orbit* framing
use `camera-systems` (this skill only triggers the shake). For mixing, ducking, and adaptive
music use `audio-design`. For shader-based dissolves/flashes use `shader-programming` and the
engine shader skill. For the concrete tween/particle node APIs, use the engine animation skill
(`godot-animation`, `unity-animation`).

## Core principle: feedback is layered and exaggerated

A hit can combine sound, a particle burst, hit-stop, flash, knockback, shake, or a number
pop. These are options, not a required stack: **5–8 channels / ~100 ms is not a universal
threshold or a measurement from a reference video**. Start with the minimum channels that
communicate the event. **(1)** Exaggerate briefly and return to rest; **(2)** scale feedback
to event importance; **(3)** preserve readable actors and cues. More layers do not by
themselves prove better feel, acceptable cost, or accessibility.

## Core workflow

1. **Confirm the event hooks exist.** Juice attaches to discrete events: `on_hit`, `on_land`,
   `on_pickup`, `on_death`, `on_fire`. If the mechanic doesn't emit these, add them first.
2. **Pick feedback channels per event** from the menu (sound, particles, shake, hit-stop,
   flash, knockback, tween, number pop). Start with 2–3; add until it reads, then stop.
3. **Make motion eased, not linear.** Route scale/position/UI changes through a tween with an
   ease (overshoot for "pop", ease-out for "settle"). Linear motion feels robotic.
4. **Reserve hit-stop and shake for impact.** They are the strongest, most abusable tools —
   short durations, scaled to importance, and never on routine actions.
5. **Keep feedback off the critical simulation.** Shake moves the *camera/visual*, not the
   body; hit-stop uses time scale or a real-time pause, not a gameplay-logic stall.
6. **Tune by importance tiers.** Define small/medium/large feedback presets and assign events
   to a tier, so the whole game's juice stays consistent and proportional.
7. **Verify by playing and watching.** Trigger the event repeatedly; confirm the feedback
   fires, returns to rest, and is not nauseating or input-blocking. Report what you observed
   (does shake decay? does input still register during hit-stop?).

## 从游戏录像借鉴反馈（不是测量真实体感）

将录像视为表现证据，不视为源码、操作实验或可再分发素材。需要时间点案例、
预示/释放/恢复、统一图形词汇与低干扰对比时，按需读
[录像反馈案例与迁移配方](references/video-feedback-case.md)。本技能仍是经验参考，
不附带视频下载器、解码器、引擎实现或玩家实验。

- 先记录实际可读范围：只有页面/字幕、静态帧、密集帧序列，还是连续音画；
  为观察附时间点，分开 `observed`、`author-described`、`inferred`、`unverified`。
  不可读取就请求片段，不能用标题或推荐语代替画面观察。
- 先问事件表达什么，再考虑特效：主体是否可追踪、预示和释放是否可区分、
  临时强调是否回落。提炼信息职责与编排，不复刻原作图腾、角色、音乐或整段关卡。
- 录像扩环不等于镜头缩放，亮色不等于伤害生效，停画面不等于设计 hit-stop，
  均匀抽帧不能证明音乐同步或闪光安全；视频重试也不是新阶段。
- 参数写成待调起点，不冒充逐帧测量或目标平台验证。反馈绑定已确认事件，
  不擅改碰撞、输入窗口、运动数值或判定；发现此类需求另配机制实现。
- 输出：事件/目标 → 时间点与证据等级 → 信息职责 → 原创反馈方案 → 实现依赖
  → 验证/未知项。实际操作、连续音画、性能与可访问性分别验证；不要承诺同等体感。

## Patterns

### 1. Screen shake by decaying "trauma" (smooth, not a random jitter)

```gdscript
# Godot 4.7. Store trauma 0..1; shake = trauma^2 so small hits barely move, big hits punch.
# Drives a Camera2D OFFSET (the visual), never the player body. Decays every frame.
@export var decay := 1.2          # trauma lost per second
@export var max_offset := Vector2(12, 8)
@export var max_roll := 0.1       # radians
var trauma := 0.0
var _t := 0.0

func add_trauma(amount: float) -> void:
    trauma = clampf(trauma + amount, 0.0, 1.0)   # hits ADD; they don't reset

func _process(dt: float) -> void:
    if trauma <= 0.0: return
    trauma = maxf(trauma - decay * dt, 0.0)
    var shake := trauma * trauma                  # quadratic: gentle low, sharp high
    _t += dt * 30.0
    # Smooth pseudo-random via sampled noise/sin, NOT rand each frame (that buzzes).
    offset = Vector2(max_offset.x * shake * sin(_t * 1.7),
                     max_offset.y * shake * sin(_t * 2.3))
    rotation = max_roll * shake * sin(_t * 1.1)
# Unity 6.3 LTS: identical model on a CinemachineCamera via CinemachineBasicMultiChannelPerlin
# (set AmplitudeGain/FrequencyGain from trauma^2) — see camera-systems.
```

### 2. Hit-stop / freeze frame (sell impact by briefly stopping time)

```gdscript
# Godot 4.7. Drop time scale, then restore after a REAL-TIME delay (unaffected by time_scale).
func hit_stop(duration := 0.08, scale := 0.05) -> void:
    Engine.time_scale = scale
    # 4th arg ignore_time_scale=true → the timer still fires while the game is frozen.
    await get_tree().create_timer(duration, true, false, true).timeout
    Engine.time_scale = 1.0
```

```csharp
// Unity 6.3 LTS (C#). WaitForSecondsRealtime ignores Time.timeScale, so the timer still elapses.
IEnumerator HitStop(float duration = 0.08f, float scale = 0.05f) {
    Time.timeScale = scale;
    yield return new WaitForSecondsRealtime(duration);
    Time.timeScale = 1f;            // RIGHT: real-time wait. WRONG: WaitForSeconds (never resumes at scale 0)
}
```

### 3. Squash & stretch + overshoot via an eased tween (the "pop")

```gdscript
# Godot 4.7. Conserve volume: stretch one axis, squash the other, then spring back with overshoot.
func pop(node: Node2D) -> void:
    node.scale = Vector2(1.3, 0.7)                       # instant squash on the event
    var tw := create_tween()
    tw.tween_property(node, "scale", Vector2.ONE, 0.18) \
      .set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)   # BACK = overshoots past 1, settles
# RIGHT: ease back (TRANS_BACK/ELASTIC) for life. WRONG: linear tween → mechanical, dead.
```

### 4. A feedback bundle scaled by importance (keep juice proportional)

```gdscript
# One call per event; the tier decides intensity so the whole game stays consistent.
func feedback(event_pos: Vector2, tier: String) -> void:
    match tier:
        "small":  AudioBus.play("tick");  Camera.add_trauma(0.15)
        "medium": AudioBus.play("hit");   Camera.add_trauma(0.4);  hit_stop(0.05); spawn_particles(event_pos, 6)
        "large":  AudioBus.play("boom");  Camera.add_trauma(0.8);  hit_stop(0.12); spawn_particles(event_pos, 30); flash_white(0.06)
```

## Pitfalls

- **Shaking the player/body instead of the camera offset** desyncs collision and aim. Shake
  the camera (or a visual pivot), never the simulated transform.
- **Random offset every frame** buzzes like static. Drive shake from sampled noise/sin and a
  decaying trauma value so it's smooth and self-ending.
- **Hit-stop with `WaitForSeconds` / a scaled timer** never resumes (at time scale 0 the timer
  never advances). Use a real-time wait (`WaitForSecondsRealtime`, or Godot's
  `ignore_time_scale` timer).
- **Hit-stop on every frame of a held attack** locks the game. Trigger it once per impact.
- **Linear tweens everywhere** feel robotic. Ease almost everything; reserve overshoot
  (BACK/ELASTIC) for "pop" and ease-out for "settle".
- **Permanent exaggeration** (scale never returns, shake never decays) becomes the new normal
  and stops reading as feedback. Juice must return to rest.
- **Over-juicing routine actions** (full shake + hit-stop on every footstep) causes nausea and
  hides real impacts. Scale to importance; add a "reduce screen shake"/"reduce flashing"
  accessibility option.
- **Feedback that blocks input** (long freeze, un-cancelable animation) hurts responsiveness.
  Keep juice short and let input buffer through it.

## 开源动效节奏拆解与保布局重排

遇到“只改节奏”“差异看不出来”、星级结算、循环相位分析，读 [开源节拍案例与常速验收](references/open-motion-timing.md)。按源码取峰值与间隔，按项目动作单独验收。

## References

- For the trauma-shake math, easing-curve cheat sheet (which ease for pop vs settle), knockback
  + flash + number-pop recipes, importance-tier presets, and per-engine tween/particle bindings,
  read `references/feedback-recipes.md`.

## Related skills

- `camera-systems` — owns camera follow/deadzone/orbit; this skill only feeds it shake trauma.
- `godot-animation`, `unity-animation` — concrete tween/AnimationPlayer/particle APIs juice rides on.
- `audio-design` — the sound layer of every feedback bundle; ducking and SFX variation.
- `physics-tuning` — knockback forces and the timestep juice must not destabilize.
- `platformer`, `fps-shooter`, `roguelike` — genres whose moment-to-moment feel this elevates.
