FROM python:3.11-slim-bullseye

WORKDIR /app

COPY requirements.txt .

RUN pip install --upgrade pip
RUN pip config set global.timeout 100
RUN pip config set global.index-url https://pypi.org/simple
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
