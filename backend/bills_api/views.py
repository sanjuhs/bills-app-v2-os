import os

from django.http import HttpResponse, JsonResponse


def hello_world(_request):
    return JsonResponse({"message": "Hello world from Bills API"})


def swagger_ui(_request):
    spec_url = "/api/openapi.json"
    return HttpResponse(f"""<!DOCTYPE html>
<html><head>
<title>Bills API — Swagger</title>
<link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css">
</head><body>
<div id="swagger-ui"></div>
<script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
<script>SwaggerUIBundle({{url:"{spec_url}",dom_id:"#swagger-ui",deepLinking:true}})</script>
</body></html>""", content_type="text/html")


def openapi_spec(_request):
    spec_path = os.path.join(os.path.dirname(__file__), "openapi.json")
    with open(spec_path) as f:
        return HttpResponse(f.read(), content_type="application/json")
