import os
import re
import sys
import yaml
import requests

FORUM_URL = "https://forums.rancher.cn"
API_KEY = os.getenv("RANCHER_FORUM_API_KEY")
USERNAME = os.getenv("RANCHER_FORUM_USER")
CATEGORY_ID = os.getenv("RANCHER_FORUM_CATEGORY")

def parse_markdown(file_path):
    """解析 Markdown 的 Front Matter 与正文"""
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()

    # 匹配 YAML Front Matter
    front_matter_match = re.match(r"^---\s*\n(.*?)\n---\s*\n(.*)$", content, re.DOTALL)
    if front_matter_match:
        yaml_content = front_matter_match.group(1)
        body = front_matter_match.group(2)
        meta = yaml.safe_load(yaml_content) or {}
        title = meta.get("title")
    else:
        title = None
        body = content

    # 若未在 Front Matter 配置 title，提取文件名作为标题
    if not title:
        base_name = os.path.basename(file_path).replace(".md", "")
        # 过滤 Jekyll 常见的 2026-08-06- 前缀
        title = re.sub(r"^\d{4}-\d{2}-\d{2}-", "", base_name).replace("-", " ").capitalize()

    return title, body.strip()

def publish_topic(title, body, file_path):
    """调用 Discourse API 发布帖子"""
    if not API_KEY or not USERNAME or not CATEGORY_ID:
        print("❌ 错误：缺少环境变量配置 (API_KEY / USERNAME / CATEGORY_ID)")
        sys.exit(1)

    headers = {
        "Api-Key": API_KEY,
        "Api-Username": USERNAME,
        "Content-Type": "application/json"
    }

    payload = {
        "title": title,
        "raw": body,
        "category": int(CATEGORY_ID)
    }

    url = f"{FORUM_URL}/posts.json"
    response = requests.post(url, json=payload, headers=headers)

    if response.status_code == 200:
        res_data = response.json()
        topic_id = res_data.get("topic_id")
        print(f"✅ 成功发布文章 [{title}] -> 帖子 URL: {FORUM_URL}/t/{topic_id}")
    else:
        print(f"❌ 发布失败文件 [{file_path}]")
        print(f"状态码: {response.status_code}, 响应: {response.text}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("用法: python sync_to_forum.py ")
        sys.exit(1)

    target_file = sys.argv[1]
    if not os.path.exists(target_file):
        print(f"文件不存在: {target_file}")
        sys.exit(1)

    post_title, post_body = parse_markdown(target_file)
    publish_topic(post_title, post_body, target_file)
