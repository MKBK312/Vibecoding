FROM python:3.11-slim

WORKDIR /app

# 系统依赖：PyMuPDF 需要的 libmupdf，PaddlePaddle 需要的 libgomp/libsndfile/libgl
RUN apt-get update && apt-get install -y --no-install-recommends \
    libmupdf-dev \
    libgomp1 \
    libsndfile1 \
    libgl1-mesa-glx \
    && rm -rf /var/lib/apt/lists/*

# ChromaDB 数据 + 上传文件持久化目录（在 COPY 之前创建，最大化缓存利用率）
RUN mkdir -p /data/chroma /uploads

# 先安装依赖（利用 Docker 缓存）
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 复制应用代码
COPY . .

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
