FROM python:3.11-alpine
RUN apk add --no-cache gcc musl-dev libpq-dev
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY crawl_sox.py .
COPY scheduler.py .
CMD ["python3", "scheduler.py"]

