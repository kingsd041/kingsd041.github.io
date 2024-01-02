---
layout: post
title: Beyond Compare 重新评估
subtitle: 解决 Mac Beyond compare 30天过期问题
date: 2023-11-26 11:07:00 +0800
author: Ksd
header-img: img/post-bg-desk.jpg
catalog: true
tags:
  - Beyond Compare
---

Beyond Compare 版本：4.4

```
$ cd /Users/ksd/Library/Application\ Support/Beyond\ Compare
$ mv registry.dat registry.dat.bak
```

随后，启动 Beyond Compare，可以看到重新获取到了 30 天的评估时间：

![](https://raw.githubusercontent.com/kingsd041/picture/main/202311262056953.png)
