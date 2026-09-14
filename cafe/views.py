import json
import random
from decimal import Decimal
from django.shortcuts import render, get_object_or_404, redirect
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.utils import timezone
from .models import Category, MenuItem, DeliveryPartner, Order, OrderItem


def index(request):
    categories = Category.objects.all().order_by("display_order", "name")
    items = MenuItem.objects.filter(available=True).select_related("category")
    featured_items = items.filter(featured=True)[:6]
    partners = DeliveryPartner.objects.filter(active=True)

    items_payload = [item.to_dict() for item in items]
    categories_payload = [cat.to_dict() for cat in categories]

    context = {
        "categories": categories,
        "items": items,
        "featured_items": featured_items,
        "partners": partners,
        "items_json": json.dumps(items_payload),
        "categories_json": json.dumps(categories_payload),
    }
    return render(request, "cafe/index.html", context)


def track_order_page(request, order_number):
    order = get_object_or_404(Order, order_number=order_number)
    items = order.items.select_related("menu_item").all()
    context = {
        "order": order,
        "items": items,
        "partner": order.delivery_partner,
    }
    return render(request, "cafe/track.html", context)


def api_menu(request):
    categories = Category.objects.all().order_by("display_order", "name")
    items = MenuItem.objects.filter(available=True).select_related("category")

    cat_data = [cat.to_dict() for cat in categories]
    item_data = [item.to_dict() for item in items]

    return JsonResponse({
        "status": "success",
        "categories": cat_data,
        "items": item_data,
    })


@csrf_exempt
def api_estimate_delivery(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST required"}, status=405)

    try:
        data = json.loads(request.body.decode("utf-8"))
    except Exception:
        data = {}

    pincode = str(data.get("pincode", "110001")).strip()
    address = data.get("address", "").strip()

    # Calculate deterministic yet varied distance for demonstration
    seed_val = sum(ord(c) for c in (pincode + address)) if (pincode or address) else 42
    rng = random.Random(seed_val)
    distance_km = round(rng.uniform(0.7, 2.4), 1)

    # 15-Minute Guaranteed Speed Engine
    # Farzi Turbo Dispatch: 3 mins prep + (distance * 3 mins per km)
    est_time_mins = min(15, max(8, int(4 + distance_km * 3.5)))

    dark_pod = f"Farzi Turbo Hub #{rng.choice(['01 - Connaught Hub', '04 - Cyber Hub', '09 - Aerocity Node'])}"

    return JsonResponse({
        "status": "success",
        "pincode": pincode,
        "distance_km": distance_km,
        "eta_mins": est_time_mins,
        "dark_pod": dark_pod,
        "guarantee": "15-Minute Flash Delivery Guaranteed or Your Order is on Farzi!",
        "delivery_fee": 0.00,
    })


@csrf_exempt
def api_create_order(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST required"}, status=405)

    try:
        data = json.loads(request.body.decode("utf-8"))
    except Exception as e:
        return JsonResponse({"error": f"Invalid JSON payload: {str(e)}"}, status=400)

    customer_name = data.get("customer_name", "").strip()
    customer_phone = data.get("customer_phone", "").strip()
    customer_address = data.get("customer_address", "").strip()
    delivery_pincode = data.get("delivery_pincode", "110001").strip()
    delivery_notes = data.get("delivery_notes", "").strip()
    delivery_type = data.get("delivery_type", "turbo_15")
    payment_method = data.get("payment_method", "Farzi Turbo FastPay")
    cart_items = data.get("items", [])

    if not customer_name or not customer_phone or not customer_address:
        return JsonResponse({"error": "Please provide customer name, phone number, and address."}, status=400)

    if not cart_items:
        return JsonResponse({"error": "Your cart is empty."}, status=400)

    # Assign random active partner
    partners = list(DeliveryPartner.objects.filter(active=True))
    assigned_partner = random.choice(partners) if partners else None

    # Calculate distance & ETA
    rng = random.Random(customer_phone)
    distance_km = round(rng.uniform(0.8, 2.2), 1)
    est_mins = min(15, max(9, int(4 + distance_km * 3.5)))

    order = Order.objects.create(
        customer_name=customer_name,
        customer_phone=customer_phone,
        customer_address=customer_address,
        delivery_pincode=delivery_pincode,
        delivery_notes=delivery_notes,
        delivery_type=delivery_type,
        distance_km=distance_km,
        delivery_partner=assigned_partner,
        payment_method=payment_method,
        estimated_delivery_mins=est_mins,
    )

    subtotal = Decimal("0.00")
    for ci in cart_items:
        item_id = ci.get("item_id")
        qty = int(ci.get("quantity", 1))
        customization = ci.get("customization", "")

        try:
            menu_item = MenuItem.objects.get(id=item_id)
        except MenuItem.DoesNotExist:
            continue

        item_price = menu_item.price
        subtotal += (item_price * qty)

        OrderItem.objects.create(
            order=order,
            menu_item=menu_item,
            quantity=qty,
            unit_price=item_price,
            customization=customization,
        )

    # 5% GST tax, free express delivery
    tax = round(subtotal * Decimal("0.05"), 2)
    delivery_fee = Decimal("0.00")
    total_amount = subtotal + tax + delivery_fee

    order.subtotal = subtotal
    order.tax_amount = tax
    order.delivery_fee = delivery_fee
    order.total_amount = total_amount
    order.save()

    return JsonResponse({
        "status": "success",
        "order_number": order.order_number,
        "track_url": f"/track/{order.order_number}/",
        "eta_mins": order.estimated_delivery_mins,
        "total_amount": float(order.total_amount),
    })


def api_order_status(request, order_number):
    order = get_object_or_404(Order, order_number=order_number)
    elapsed = order.elapsed_seconds()
    sim_status = order.current_simulated_status()

    # Define stage metadata & timelines
    stages = [
        {"key": "received", "label": "Order Accepted", "sub": "Molecular Kitchen alerted & tickets printed", "time": 0},
        {"key": "preparing", "label": "Molecular Prep", "sub": "Chefs infusing liquid nitrogen & wood smoke", "time": 25},
        {"key": "packed", "label": "Flash Insulated Packaging", "sub": "Vacuum sealed in thermal pods for maximum temperature lock", "time": 65},
        {"key": "dispatched", "label": "Turbo Rider Dispatched", "sub": "High-speed electric transit en-route to your door", "time": 110},
        {"key": "delivered", "label": "Arrived & Served", "sub": "Bon Appetit! The Farzi illusion is at your doorstep", "time": 200},
    ]

    total_sim_duration = 200
    progress_percent = min(100, int((elapsed / total_sim_duration) * 100))

    # Calculate remaining time in minutes & seconds
    remaining_secs = max(0, total_sim_duration - elapsed)
    rem_mins = remaining_secs // 60
    rem_secs = remaining_secs % 60

    # Simulate rider location progression along route
    # Origin: [28.6315, 77.2167] (Connaught Place, Farzi HQ)
    # Target: [28.6380, 77.2250] (Customer location)
    rider_progress = 0.0
    speed_kmh = 0
    if sim_status == "dispatched":
        # Dispatched is from 110s to 200s (90 seconds duration)
        disp_elapsed = elapsed - 110
        rider_progress = min(1.0, max(0.05, disp_elapsed / 90.0))
        speed_kmh = random.randint(48, 62)
    elif sim_status == "delivered":
        rider_progress = 1.0
        speed_kmh = 0

    partner_data = order.delivery_partner.to_dict() if order.delivery_partner else {
        "name": "Farzi Turbo Rider",
        "phone": "+91 98110 54321",
        "vehicle_type": "Farzi Hyperspeed EV",
        "vehicle_number": "FZ-TURBO-01",
        "rating": 4.98,
        "avatar": "⚡",
    }

    order_items = [
        {
            "name": item.menu_item.name,
            "quantity": item.quantity,
            "unit_price": float(item.unit_price),
            "total_price": float(item.total_price()),
            "is_veg": item.menu_item.is_veg,
            "customization": item.customization,
        }
        for item in order.items.all()
    ]

    return JsonResponse({
        "status": "success",
        "order_number": order.order_number,
        "customer_name": order.customer_name,
        "customer_phone": order.customer_phone,
        "customer_address": order.customer_address,
        "delivery_pincode": order.delivery_pincode,
        "delivery_type": order.delivery_type,
        "current_status": sim_status,
        "status_display": order.get_status_display(),
        "elapsed_seconds": elapsed,
        "remaining_seconds": remaining_secs,
        "eta_countdown": f"{rem_mins:02d}:{rem_secs:02d}",
        "progress_percent": progress_percent,
        "stages": stages,
        "speed_kmh": speed_kmh,
        "rider_progress": round(rider_progress, 3),
        "partner": partner_data,
        "subtotal": float(order.subtotal),
        "tax_amount": float(order.tax_amount),
        "delivery_fee": float(order.delivery_fee),
        "total_amount": float(order.total_amount),
        "payment_method": order.payment_method,
        "items": order_items,
        "created_at": order.created_at.strftime("%I:%M %p, %d %b %Y"),
    })
