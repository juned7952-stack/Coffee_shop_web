import uuid
from django.db import models
from django.utils import timezone


class Category(models.Model):
    name = models.CharField(max_length=100)
    slug = models.SlugField(unique=True)
    icon = models.CharField(max_length=50, help_text='Emoji or icon identifier, e.g. 🍸, 🍔, 🔥, 🍨')
    description = models.TextField(blank=True)
    display_order = models.PositiveIntegerField(default=0)

    class Meta:
        verbose_name_plural = 'Categories'
        ordering = ['display_order', 'name']

    def __str__(self):
        return f'{self.icon} {self.name}'

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'slug': self.slug,
            'icon': self.icon,
            'description': self.description,
        }


class MenuItem(models.Model):
    SPICE_CHOICES = [
        (0, 'Mild & Zero Heat'),
        (1, 'Gentle Warmth'),
        (2, 'Farzi Zesty Punch'),
        (3, 'Volcanic Fiery Heat'),
    ]

    MODEL_TYPE_CHOICES = [
        ('cocktail', 'Farzi Smoked Cocktail Goblet'),
        ('burger', 'Gourmet Truffle Fusion Slider'),
        ('dessert', 'Liquid Nitrogen Sphere Dessert'),
        ('arancini', 'Dal Chawal Arancini Pops'),
        ('bao', 'Steamed Charcoal Truffle Bao'),
        ('curry', 'Smoking Claypot Butter Chicken'),
    ]

    name = models.CharField(max_length=150)
    slug = models.SlugField(unique=True)
    category = models.ForeignKey(Category, on_delete=models.CASCADE, related_name='items')
    price = models.DecimalField(max_digits=8, decimal_places=2)
    tagline = models.CharField(max_length=200, blank=True, help_text='e.g. Molecular Fog & Smoked Citrus')
    description = models.TextField()
    ingredients = models.TextField(help_text='Comma-separated ingredients for the 3D explosion view')
    is_veg = models.BooleanField(default=False)
    is_signature = models.BooleanField(default=False)
    prep_time_mins = models.PositiveIntegerField(default=8)
    calories = models.PositiveIntegerField(default=350)
    spice_level = models.IntegerField(choices=SPICE_CHOICES, default=1)
    model_type = models.CharField(max_length=50, choices=MODEL_TYPE_CHOICES, default='burger')
    rating = models.DecimalField(max_digits=3, decimal_places=2, default=4.9)
    reviews_count = models.PositiveIntegerField(default=84)
    image_url = models.CharField(max_length=500, blank=True)
    available = models.BooleanField(default=True)
    featured = models.BooleanField(default=False)

    class Meta:
        ordering = ['-featured', '-is_signature', 'name']

    def __str__(self):
        type_badge = '🟢 Veg' if self.is_veg else '🔴 Non-Veg'
        return f'{self.name} ({type_badge}) - ₹{self.price}'

    def ingredients_list(self):
        return [i.strip() for i in self.ingredients.split(',') if i.strip()]

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'slug': self.slug,
            'category_id': self.category_id,
            'category_name': self.category.name,
            'price': float(self.price),
            'tagline': self.tagline,
            'description': self.description,
            'ingredients': self.ingredients_list(),
            'is_veg': self.is_veg,
            'is_signature': self.is_signature,
            'prep_time_mins': self.prep_time_mins,
            'calories': self.calories,
            'spice_level': self.spice_level,
            'model_type': self.model_type,
            'rating': float(self.rating),
            'reviews_count': self.reviews_count,
            'image_url': self.image_url,
            'available': self.available,
            'featured': self.featured,
        }


class DeliveryPartner(models.Model):
    name = models.CharField(max_length=100)
    phone = models.CharField(max_length=20)
    vehicle_type = models.CharField(max_length=100, default='Farzi Turbo Hyperspeed EV')
    vehicle_number = models.CharField(max_length=50, default='FZ-TURBO-09')
    rating = models.DecimalField(max_digits=3, decimal_places=2, default=4.95)
    avatar = models.CharField(max_length=200, default='⚡')
    active = models.BooleanField(default=True)

    def __str__(self):
        return f'{self.name} ({self.vehicle_number}) ★ {self.rating}'

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'phone': self.phone,
            'vehicle_type': self.vehicle_type,
            'vehicle_number': self.vehicle_number,
            'rating': float(self.rating),
            'avatar': self.avatar,
        }


class Order(models.Model):
    STATUS_CHOICES = [
        ('received', 'Order Received & Kitchen Alerted'),
        ('preparing', 'Molecular Gastronomy Prep & Cooking'),
        ('packed', 'Flash Nitrogen Thermal Sealed'),
        ('dispatched', 'Farzi Turbo Rider High-Speed Transit'),
        ('delivered', 'Arrived at Your Doorstep'),
    ]

    order_number = models.CharField(max_length=32, unique=True, editable=False)
    customer_name = models.CharField(max_length=100)
    customer_phone = models.CharField(max_length=20)
    customer_address = models.TextField()
    delivery_pincode = models.CharField(max_length=10, default='110001')
    delivery_notes = models.TextField(blank=True)
    delivery_type = models.CharField(max_length=30, default='turbo_15', choices=[
        ('turbo_15', 'Farzi Turbo 15-Min Guaranteed Express'),
        ('standard', 'Standard Gourmet Delivery'),
    ])
    distance_km = models.FloatField(default=1.4)
    delivery_partner = models.ForeignKey(
        DeliveryPartner, on_delete=models.SET_NULL, null=True, blank=True, related_name='orders'
    )
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='received')
    subtotal = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    delivery_fee = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    tax_amount = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    total_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    payment_method = models.CharField(max_length=50, default='Farzi Turbo FastPay')
    estimated_delivery_mins = models.PositiveIntegerField(default=14)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def save(self, *args, **kwargs):
        if not self.order_number:
            self.order_number = f'FZ-{uuid.uuid4().hex[:8].upper()}'
        super().save(*args, **kwargs)

    def __str__(self):
        return f'Order #{self.order_number} - {self.customer_name} (₹{self.total_amount})'

    def elapsed_seconds(self):
        now = timezone.now()
        return max(0, int((now - self.created_at).total_seconds()))

    def current_simulated_status(self):
        if self.status == 'delivered':
            return 'delivered'
        elapsed = self.elapsed_seconds()
        if elapsed < 25:
            return 'received'
        elif elapsed < 65:
            return 'preparing'
        elif elapsed < 110:
            return 'packed'
        elif elapsed < 200:
            return 'dispatched'
        else:
            return 'delivered'


class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='items')
    menu_item = models.ForeignKey(MenuItem, on_delete=models.CASCADE)
    quantity = models.PositiveIntegerField(default=1)
    unit_price = models.DecimalField(max_digits=8, decimal_places=2)
    customization = models.CharField(max_length=200, blank=True)

    def total_price(self):
        return self.quantity * self.unit_price

    def __str__(self):
        return f'{self.quantity}x {self.menu_item.name} for #{self.order.order_number}'
