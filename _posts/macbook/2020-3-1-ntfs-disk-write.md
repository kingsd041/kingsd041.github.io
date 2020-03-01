---
layout:     post
title:      如何将 Mac 里的文件复制到 NTFS 格式的移动硬盘里
subtitle:   
date:       2020-3-1
author:     Ksd
header-img: img/post-bg-rwd.jpg
catalog: 	 true
tags:
    - MacBookPro
    - MBP
---

# 讲下理论
Mac本身是支持NTFS写入的，只是NTFS是微软开发，由于版权和一些技术细节原因，苹果不愿公开说自己支持NTFS写入，也是有自己以后可能不支持NTFS写入的考量

## 开启流程简介 
1. 挂载上你的NTFS硬盘，查看硬盘名称
2. 编辑/etc/fstab文件，使其支持NTFS写入
3. 将/Volumes中的NTFS磁盘快捷方式到Finder

## 详细流程
1. 插上硬盘后，查看你的硬盘名称，这里假设名称是AngleDisk，牢记之（你的可不是这个呀！！）
2. 打开Applications的Terminal, 你也可以直接spotlight输入terminal打开
3. 在终端输入sudo nano /etc/fstab 敲击回车
4. 现在你看到了一个编辑界面，输入LABEL=AngleDisk none ntfs rw,auto,nobrowse后，敲击回车，再Ctrl+X，再敲击Y，再敲击回车
5. 此时，退出你的移动硬盘，再重新插入，你会发现磁盘没有显示在桌面或是Finder之前出现的地方，别慌
6. 打开Finder，Command+Shift+G，输入框中输入/Volumes，回车，你就可以看到你的磁盘啦！是可以读写的哟，Enjoy
7. 方便起见，你可以直接把磁盘拖到Finder侧边栏中，这样下次使用就不用进入到/Volumes目录打开le

作者：知乎用户
链接：https://www.zhihu.com/question/19571334/answer/224291746
来源：知乎
著作权归作者所有。商业转载请联系作者获得授权，非商业转载请注明出处。
