FROM python:3.11-alpine
RUN apk add --no-cache gcc musl-dev libpq-dev
RUN pip install --no-cache-dir psycopg2-binary requests
WORKDIR /app
COPY crawl_sox.py .
COPY scheduler.py .
CMD ["python3", "scheduler.py"]
