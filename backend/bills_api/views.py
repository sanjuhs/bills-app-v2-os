from django.http import JsonResponse


def hello_world(_request):
    return JsonResponse({"message": "Hello world from Bills API"})
