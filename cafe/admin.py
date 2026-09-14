from django.contrib import admin
from .models import Category, MenuItem, DeliveryPartner, Order, OrderItem


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'icon', 'slug', 'display_order')
    prepopulated_fields = {'slug': ('name',)}
    search_fields = ('name',)


@admin.register(MenuItem)
class MenuItemAdmin(admin.ModelAdmin):
    list_display = ('name', 'category', 'price', 'is_veg', 'is_signature', 'prep_time_mins', 'spice_level', 'available')
    list_filter = ('category', 'is_veg', 'is_signature', 'available', 'model_type')
    search_fields = ('name', 'description', 'ingredients')
    prepopulated_fields = {'slug': ('name',)}


@admin.register(DeliveryPartner)
class DeliveryPartnerAdmin(admin.ModelAdmin):
    list_display = ('name', 'phone', 'vehicle_type', 'vehicle_number', 'rating', 'active')
    list_filter = ('active', 'vehicle_type')
    search_fields = ('name', 'phone', 'vehicle_number')


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ('order_number', 'customer_name', 'customer_phone', 'status', 'delivery_type', 'total_amount', 'created_at')
    list_filter = ('status', 'delivery_type', 'created_at')
    search_fields = ('order_number', 'customer_name', 'customer_phone', 'customer_address')
    inlines = [OrderItemInline]
    readonly_fields = ('order_number', 'created_at', 'updated_at')
