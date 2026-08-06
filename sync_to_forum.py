import os
import re
import sys
import yaml
import requests

FORUM_URL = "https://forums.rancher.cn"
API_KEY = os.getenv("RANCHER_FORUM_API_KEY")
USERNAME = os.getenv("RANCHER_FORUM_USER")
CATEGORY_ID = os.getenv("RANCHER_FORUM_CATEGORY")

# 明确允许同步的 7 个产品子目录名
ALLOWED_CATEGORIES = {
    "harvester", 
    "k3s", 
    "longhorn", 
    "neuvector", 
    "rancher", 
    "rancherdesktop", 
    "rke2"
}

def is_allowed_file(file_path):
    """检查文件是否属于允许同步的 7 个目录之一"""
    # 将路径标准化为正斜杠，防止 Windows 兼容性问题
    normalized_path = file_path.replace("\\", "/")
    parts = normalized_path.split("/")
    
    # 判断路径结构是否为 _posts/<category>/...
    if "posts" in parts or "_posts" in parts:
        try:
            # 找到 _posts 所在的下标，下一级就是分类目录名
            posts_idx = parts.index("_posts") if "_posts" in parts else parts.index("posts")
            category_dir = parts[posts_idx + 1]
            return category_dir in ALLOWED_CATEGORIES
        except IndexError:
            return False
    return False

def parse_markdown(file_path):
    """解析 Markdown 的 Front Matter 与正文"""
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()

    front_matter_match = re.match(r"^---\s*\n(.*?)\n---\s*\n(.*)$", content, re.DOTALL)
    if front_matter_match:
        yaml_content = front_matter_match.group(1)
        body = front_matter_match.group(2)
        meta = yaml.safe_load(yaml_content) or {}
        title = meta.get("title")
    else:
        title = None
        body = content

    if not title:
        base_name = os.path.basename(file_path).replace(".md", "")
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
        print("用法: python sync_to_forum.py <path_to_markdown_file>")
        sys.exit(1)

    target_file = sys.argv[1]
    
    if not os.path.exists(target_file):
        print(f"文件不存在: {target_file}")
        sys.exit(1)

    # 路径拦截判断
    if not is_allowed_file(target_file):
        print(f"⚠️ 忽略跳过: 文件 [{target_file}] 不属于指定的 7 个同步目录之一。")
        sys.exit(0)

    post_title, post_body = parse_markdown(target_file)
    publish_topic(post_title, post_body, target_file)
