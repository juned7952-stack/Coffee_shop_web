import json
from decimal import Decimal
from django.test import TestCase, Client
from django.urls import reverse
from cafe.models import Category, MenuItem, DeliveryPartner, Order, OrderItem


class FarziCafeTests(TestCase):
    def setUp(self):
        self.client = Client()

        self.category = Category.objects.create(
            name="Farzi Molecular Sips",
            slug="molecular-sips",
            icon="🍸",
            description="Smoked cocktails & potions",
            display_order=1,
        )

        self.item = MenuItem.objects.create(
            name="Farzi Mist Molecular Cocktail",
            slug="farzi-mist-cocktail",
            category=self.category,
            price=Decimal("349.00"),
            tagline="Cold-Pressed Citrus & Smoke Mist",
            description="Signature Farzi molecular drink with blood orange and dry ice mist.",
            ingredients="Blood Orange, Yuzu Fizz, Rosemary Smoke, Dry Ice Mist",
            is_veg=True,
            is_signature=True,
            prep_time_mins=4,
            calories=180,
            spice_level=0,
            model_type="cocktail",
            rating=Decimal("4.96"),
            reviews_count=230,
            featured=True,
            available=True,
        )

        self.partner = DeliveryPartner.objects.create(
            name="Farhan 'Nitro' Qureshi",
            phone="+91 98110 54321",
            vehicle_type="Farzi Turbo Hyperspeed EV Bike",
            vehicle_number="DL-01-FZ-7701",
            rating=Decimal("4.98"),
            avatar="⚡",
            active=True,
        )

    def test_models(self):
        # Category
        self.assertEqual(str(self.category), "🍸 Farzi Molecular Sips")
        cat_dict = self.category.to_dict()
        self.assertEqual(cat_dict["name"], "Farzi Molecular Sips")

        # MenuItem
        self.assertTrue(self.item.is_veg)
        self.assertIn("Rosemary Smoke", self.item.ingredients_list())
        item_dict = self.item.to_dict()
        self.assertEqual(item_dict["price"], 349.00)
        self.assertEqual(item_dict["model_type"], "cocktail")

        # Delivery Partner
        self.assertTrue(self.partner.active)
        self.assertIn("DL-01-FZ-7701", str(self.partner))

    def test_index_view(self):
        url = reverse("cafe:index")
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Farzi Mist Molecular Cocktail")
        self.assertContains(response, "FARZI TURBO DISPATCH")
        self.assertContains(response, "heroThreeCanvas")

    def test_api_menu(self):
        url = reverse("cafe:api_menu")
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["status"], "success")
        self.assertGreaterEqual(len(data["categories"]), 1)
        self.assertGreaterEqual(len(data["items"]), 1)

    def test_api_estimate_delivery(self):
        url = reverse("cafe:api_estimate_delivery")
        payload = {
            "pincode": "110001",
            "address": "Connaught Place, New Delhi",
        }
        response = self.client.post(url, data=json.dumps(payload), content_type="application/json")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["status"], "success")
        self.assertIn("distance_km", data)
        self.assertIn("eta_mins", data)
        self.assertLessEqual(data["eta_mins"], 15)  # 15-min speed guarantee

    def test_order_creation_and_tracking(self):
        # 1. Place order
        create_url = reverse("cafe:api_create_order")
        order_payload = {
            "customer_name": "Rohan Kapoor",
            "customer_phone": "9812345678",
            "customer_address": "Flat 202, Kasturba Gandhi Marg, Connaught Place",
            "delivery_pincode": "110001",
            "delivery_notes": "Call upon arrival",
            "delivery_type": "turbo_15",
            "payment_method": "Farzi Turbo FastPay",
            "items": [
                {
                    "item_id": self.item.id,
                    "quantity": 2,
                    "customization": "Extra smoke mist",
                }
            ],
        }

        response = self.client.post(create_url, data=json.dumps(order_payload), content_type="application/json")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["status"], "success")
        self.assertTrue(data["order_number"].startswith("FZ-"))
        order_number = data["order_number"]

        # Verify DB records
        order = Order.objects.get(order_number=order_number)
        self.assertEqual(order.customer_name, "Rohan Kapoor")
        self.assertEqual(order.items.count(), 1)
        item_entry = order.items.first()
        self.assertEqual(item_entry.quantity, 2)
        expected_subtotal = Decimal("349.00") * 2
        self.assertEqual(order.subtotal, expected_subtotal)

        # 2. Check tracking page
        track_page_url = reverse("cafe:track_order", kwargs={"order_number": order_number})
        track_resp = self.client.get(track_page_url)
        self.assertEqual(track_resp.status_code, 200)
        self.assertContains(track_resp, order_number)
        self.assertContains(track_resp, "Rohan Kapoor")
        self.assertContains(track_resp, "radarCanvas")

        # 3. Check tracking API endpoint
        status_url = reverse("cafe:api_order_status", kwargs={"order_number": order_number})
        status_resp = self.client.get(status_url)
        self.assertEqual(status_resp.status_code, 200)
        status_data = status_resp.json()
        self.assertEqual(status_data["status"], "success")
        self.assertEqual(status_data["order_number"], order_number)
        self.assertIn("current_status", status_data)
        self.assertIn("eta_countdown", status_data)
        self.assertIn("rider_progress", status_data)
        self.assertIn("partner", status_data)
        self.assertEqual(len(status_data["items"]), 1)
