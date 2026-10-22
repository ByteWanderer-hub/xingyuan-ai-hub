#!/usr/bin/env node
/**
 * scaffold-game.mjs —— 千星域玩法起点文件生成器（yuan-code）
 *
 * 用法：node scaffold-game.mjs <输出.lua> [游戏名]
 *
 * 生成带**已验证 Runtime 骨架**的起点脚本：
 *   挂载核对(有界重试) / 画布等待 / 聚合故障(GAME FAULT 块) /
 *   输入绑定(键盘+手柄, Down/Up 成对) / 状态机(STARTING→RUNNING) / 三钩子扩展点
 *
 * 生成后必做：
 *   ① 填写【交接值 TODO】——全部来自创作者交接，禁止猜值
 *   ② 在【游戏逻辑区】实现玩法（三个钩子：onBuild / onTick / 输入回调）
 *   ③ 保存 → 沙箱保存 → 试玩；任何 GAME FAULT 块整块贴回排障
 *
 * 骨架来源：俄罗斯方块 + 《双相》两个真机跑通玩法的公共部分（2026-09-16）。
 * 引擎边界清单：miliastra-code/references/engine-boundaries.md
 */
import fs from 'node:fs';

const out = process.argv[2];
const gameName = process.argv[3] || '未命名玩法';
if (!out) {
    console.error('用法: node scaffold-game.mjs <输出.lua> [游戏名]');
    process.exit(2);
}
if (fs.existsSync(out)) {
    console.error('输出文件已存在，不覆盖: ' + out);
    process.exit(2);
}

const lua = `-- ============================================================
-- yuan-code 玩法起点：${gameName}
-- v1.0（2026-09-25，脚手架生成）：开工后每次改动在**本块内**累加一行 —— 日期 + 依据 + 改动
-- ⚠️ 开工前必填下方【交接值 TODO】——全部来自创作者交接，禁止猜值
-- 骨架含：挂载核对(有界重试) / 画布等待 / 聚合故障(GAME FAULT 块) /
--         输入绑定(键盘+手柄) / 状态机(STARTING→RUNNING) / 三钩子扩展点
-- 引擎边界（Y 轴向上 / 无图源不渲染 / API 浮点不能 %d / OnDestroy 禁 Destroy）：
--   见 miliastra-code/references/engine-boundaries.md
-- ============================================================

-- ---------- 交接值 TODO（全部必填，来自创作者交接） ----------
-- 实际挂载的脚本名（不含 .lua）
local EXPECTED_NAME = "TODO_脚本名"
-- 容器节点索引（仅日志诊断用）
local CONTAINER_INDEX_HANDOVER = 0
-- 文本框控件模板索引（不需要可留 0）
local TEXTBOX_TEMPLATE = 0
-- 图片控件模板索引
local IMAGE_TEMPLATE = 0
-- 图片资产 ID（不需要图可留 0）
local IMAGE_ASSET_ID = 0
local RETRY_BUDGET = 90

-- ---------- Runtime 状态 ----------
local state = "NEW"
local failDone = false
local attempts = 0
local lastReason = "未开始"
local startedOnce = false
local owned = {}

local canvasW, canvasH

local function log(msg) print("[yuan-code] " .. msg) end

-- 聚合故障：同一故障只报一次，块内带首错与现场数据
local function fail(firstErr)
    if failDone then return end
    failDone = true
    state = "FAILED"
    print("[yuan-code] GAME FAULT BEGIN " .. "GAME_FAULT")
    log("首错=" .. tostring(firstErr))
    log("尝试=" .. attempts .. " 最后原因=" .. lastReason)
    print("[yuan-code] GAME FAULT END " .. "GAME_FAULT")
end

local function shortName(p)
    if type(p) ~= "string" or p == "" then return nil end
    local s = p:gsub("\\\\", "/")
    s = s:match("([^/]+)/?$") or s
    return (s:match("^(.*)%.lua$")) or s
end

-- ============ 挂载核对（observed：容器 GetScripts 含当前实例 + 脚本名匹配） ============
local function checkMount()
    local myId, host, myPath
    local ok, err = pcall(function()
        myId = script.scriptMappingId
        host = script.object
        myPath = script.path
    end)
    if not ok then return false, "not_ready: Script 字段(" .. tostring(err) .. ")" end
    if myId == nil then return false, "not_ready: scriptMappingId 未就绪" end
    if host == nil then return false, "not_ready: script.object 未就绪" end

    local scripts
    ok, err = pcall(function() scripts = host:GetScripts() end)
    if not ok then return false, "not_ready: GetScripts(" .. tostring(err) .. ")" end

    local found = false
    ok, err = pcall(function()
        for _, s in ipairs(scripts) do
            if s.alive and s.scriptMappingId == myId then
                found = true
                break
            end
        end
    end)
    if not ok then return false, "not_ready: 遍历容器脚本(" .. tostring(err) .. ")" end
    if not found then return nil, "mismatch: 容器中无当前实例" end

    local actual = shortName(myPath)
    if actual ~= EXPECTED_NAME then
        return nil, "mismatch: 脚本名[" .. tostring(actual) .. "]~=预期[" .. EXPECTED_NAME .. "]"
    end
    return true
end

-- ============ 控件工具（图片控件：不 SetImage 就是透明的——边界 #2） ============
local function makeImage(parent, template)
    local c
    local ok, err = pcall(function() c = game.InstantiateClientUIControl(template, parent) end)
    if not ok or not c then return nil, err end
    owned[#owned + 1] = c
    return c
end

-- ============ 输入（事件值在 Enum.KeyEventType；候选枚举特性探测） ============
local keySeen = false

local function resolveKeyEvent(enumName)
    local candidates = { "KeyEventType", "KeyboardKeyCode", "ControllerKeyCode" }
    local tried = {}
    for _, tname in ipairs(candidates) do
        local t = Enum and Enum[tname]
        if t then
            local v = t[enumName]
            if v ~= nil then return v, tname end
            tried[#tried + 1] = tname
        else
            tried[#tried + 1] = tname .. "=nil"
        end
    end
    return nil, table.concat(tried, ",")
end

local function bindEvt(enumName, fn)
    local ev, where = resolveKeyEvent(enumName)
    if ev == nil then return false, enumName .. " 未命中（试过: " .. where .. "）" end
    local ok, err = pcall(function()
        script.object:AddKeyEventListener(ev, function()
            if not keySeen then
                keySeen = true
                log("收到首个按键事件: " .. enumName .. "（输入链路通）")
            end
            fn()
            return true
        end)
    end)
    if not ok then return false, enumName .. "(" .. tostring(err) .. ")" end
    return true
end

local function bindHold(downName, upName, set)
    local ok1, e1 = bindEvt(downName, function() set(true) end)
    if not ok1 then return false, e1 end
    local ok2, e2 = bindEvt(upName, function() set(false) end)
    if not ok2 then return false, e2 end
    return true
end

-- ============ 【游戏逻辑区】下面三个钩子换成你的玩法 ============
local M = {}

-- 钩子①：RUNNING 前调用一次。建控件、初始化游戏数据。
-- ⚠️ 重置清单（换关卡/重开/重生时逐项过）：位置 / 速度 / 相位 / 计时器 / 布尔标志 / 分数语义
function M.build()
    if TEXTBOX_TEMPLATE ~= 0 then
        local tb
        local ok, err = pcall(function() tb = game.InstantiateClientUIControl(TEXTBOX_TEMPLATE, script.object) end)
        if ok and tb then
            owned[#owned + 1] = tb
            tb:SetAnchorMin(0.5, 0.5)
            tb:SetAnchorMax(0.5, 0.5)
            tb:SetPivot(0.5, 0.5)
            tb:SetSizeDelta(600, 60)
            tb:SetAnchoredPosition(0, canvasH / 2 - 44)
            tb.text = "骨架 RUNNING：${gameName}"
            tb.fontSize = 26
            tb:SetVisible(true)
            tb:SetActive(true)
        end
    end
    log("build 完成：在 M.build / M.onTick 里实现玩法")
    return nil
end

-- 钩子②：RUNNING 期间每帧调用（dt 秒）。推进玩法；只在状态变化时调 setter。
function M.onTick(dt)
    -- 示例：收到按键时这里会有输入回调（见 registerInput 的示例绑定）
end

-- 钩子③：R 重开时调用（可选）。重置清单见 M.build 注释。
function M.onReset()
end

-- 输入绑定示例（取消注释并改成你的键位）：
--   bindEvt("KeyboardJumpKeyDown", function() ... end)              -- Space 按下
--   bindHold("KeyboardMoveLeftKeyDown", "KeyboardMoveLeftKeyUp",
--            function(v) leftHeld = v end)                          -- A 按住/抬起
--   手柄：ControllerJumpKeyDown / ControllerCraftspersonKey1Down(十字左) 等，同 §26

local function registerInput()
    -- 在这里 bindEvt / bindHold；返回 nil=成功，字符串=失败原因
    return nil
end

-- ============ 生命周期 ============
function OnStart()
    if startedOnce then return end
    startedOnce = true
    state = "STARTING"
    log("OnStart -> STARTING 挂载核对（容器交接值=" .. CONTAINER_INDEX_HANDOVER .. "）")
    script:EnableUpdate(true)
end

local function tick(dt)
    if failDone or state == "FAILED" then return end
    if state == "STARTING" then
        attempts = attempts + 1
        local ok, reason = checkMount()
        if ok == nil then
            fail(reason)
            return
        end
        if not ok then
            lastReason = reason
            if attempts >= RETRY_BUDGET then
                fail("挂载核对预算耗尽")
            end
            return
        end
        local ok2, e2 = pcall(function() canvasW, canvasH = game.GetUICanvasSize() end)
        if not ok2 or not canvasW or canvasW <= 0 or canvasH <= 0 then
            lastReason = "not_ready: 画布"
            if attempts >= RETRY_BUDGET then
                fail("画布就绪预算耗尽")
            end
            return
        end
        local berr = M.build()
        if berr then
            fail(berr)
            return
        end
        local ierr = registerInput()
        if ierr then
            fail(ierr)
            return
        end
        state = "RUNNING"
        log(string.format("RUNNING -> 骨架就绪（控件 %d，画布 %.0fx%.0f）", #owned, canvasW, canvasH))
        return
    end

    if state == "RUNNING" then
        M.onTick(dt)
    end
end

function OnUpdate(dt)
    -- ⚠️ 任何 tick 内异常都转成聚合故障，绝不静默死亡（排障一轮定位的前提）
    local ok, err = pcall(tick, dt)
    if not ok then
        fail("OnUpdate 异常: " .. tostring(err))
    end
end

function OnInit()
    log("OnInit")
end

function OnEnable()
    log("OnEnable")
end

function OnDisable()
    log("OnDisable")
end

function OnDestroy()
    -- 边界 #7：OnDestroy 内控件已随脚本销毁，手动 Destroy 只会逐条警告 → 交给平台回收
    log("OnDestroy -> 控件由平台随脚本回收")
end
`;

fs.writeFileSync(out, lua, 'utf8');
console.log('已生成: ' + out);
console.log('下一步: ① 填【交接值 TODO】 ② 实现【游戏逻辑区】三钩子 ③ 保存 → 沙箱保存 → 试玩');
console.log('⚠️ GAME FAULT 块整块贴回排障；引擎边界见 miliastra-code/references/engine-boundaries.md');
console.log('★ 改完先跑两道机械门：node tools/check-lua-scope.mjs + node tools/check-lua-style.mjs --baseline（规范见 miliastra-code/references/lua-style.md）');
