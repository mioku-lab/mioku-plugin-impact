---
title: Impact 淫趴插件配置
description: 配置淫趴（牛子比拼）插件各命令的冷却时间与每日不活跃惩罚。
fields:
  - key: base.djCd
    label: 打胶 / 开导 冷却
    type: number
    description: 执行 `打胶` 或 `开导` 后再次执行的冷却时间，单位为秒。
    placeholder: 300

  - key: base.pkCd
    label: pk / 对决 冷却
    type: number
    description: 执行 `pk` / `对决` 后再次执行的冷却时间，单位为秒。
    placeholder: 60

  - key: base.suoCd
    label: 嗦牛子 冷却
    type: number
    description: 执行 `嗦牛子` 后再次执行的冷却时间，单位为秒。
    placeholder: 300

  - key: base.fuckCd
    label: 透群友 / 日群友 冷却
    type: number
    description: 执行 `透群友` / `日群友` / `透群主` / `透管理` 后再次执行的冷却时间，单位为秒。主（owner）发送该系列命令不受此冷却限制。
    placeholder: 3600

  - key: base.isalive
    label: 不活跃惩罚
    type: switch
    description: 开启后每天 0 点对所有「上次打胶超过一天」且「长度大于 1cm」的用户随机扣减 0–1cm。
---

```mioku-fields
keys:
  - base.djCd
  - base.pkCd
  - base.suoCd
  - base.fuckCd
  - base.isalive
```
