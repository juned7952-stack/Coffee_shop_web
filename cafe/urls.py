from django.urls import path
from . import views

app_name = "cafe"

urlpatterns = [
    path("", views.index, name="index"),
    path("track/<str:order_number>/", views.track_order_page, name="track_order"),
    path("api/menu/", views.api_menu, name="api_menu"),
    path("api/delivery/estimate/", views.api_estimate_delivery, name="api_estimate_delivery"),
    path("api/order/create/", views.api_create_order, name="api_create_order"),
    path("api/order/<str:order_number>/status/", views.api_order_status, name="api_order_status"),
]
