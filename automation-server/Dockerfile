# الصورة الرسمية تحتوي Chromium وجميع مكتبات النظام مسبقاً، وهذا يمنع فشل
# Railway/Render أثناء تنزيل المتصفح وحزم apt في مرحلة البناء.
FROM mcr.microsoft.com/playwright/python:v1.42.0-jammy

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

WORKDIR /app

COPY requirements.txt .
RUN python -m pip install --no-cache-dir -r requirements.txt

COPY . .

# يفشل البناء مبكراً برسالة واضحة إذا لم يكن Chromium قابلاً للإقلاع.
RUN python -c "from playwright.sync_api import sync_playwright; p=sync_playwright().start(); b=p.chromium.launch(headless=True, args=['--no-sandbox']); b.close(); p.stop(); print('Chromium OK')"

CMD ["python", "-u", "worker.py"]
