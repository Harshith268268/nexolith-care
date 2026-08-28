import math
import json
import logging
import urllib.request
import urllib.parse
import urllib.error
from rest_framework import viewsets, permissions
from rest_framework.views import APIView
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Alert
from .serializers import AlertSerializer
from reports.models import Report

logger = logging.getLogger(__name__)

def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculates the great circle distance in kilometers between two points on earth."""
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return round(R * c, 1)


class AlertViewSet(viewsets.ModelViewSet):
    serializer_class = AlertSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Only return alerts for members belonging to the current user's family
        return Alert.objects.filter(member__family__user=self.request.user).order_by('date')

    @action(detail=True, methods=['put'])
    def read(self, request, pk=None):
        alert = self.get_object()
        alert.status = 'History'
        alert.save()
        return Response({'status': 'alert marked as read'})

    @action(detail=True, methods=['put'])
    def reschedule(self, request, pk=None):
        alert = self.get_object()
        new_date = request.data.get('date')
        if new_date:
            alert.date = new_date
            alert.save()
            return Response({'status': 'alert rescheduled', 'date': alert.date})
        return Response({'error': 'date not provided'}, status=400)


class NearbyCareView(APIView):
    """
    Exposes a 100% dynamic, real nearby medical facility search API.
    Verifies user ownership & presence of at least one CRITICAL health alert or report parameter.
    Queries real live GIS Overpass/Places provider using the user's explicit coordinates.
    Filters out unverified or generic placeholder names like 'Hospital' or 'Clinic'.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        lat = request.data.get('latitude')
        lng = request.data.get('longitude')
        radius_km = request.data.get('radius_km', 5)

        if lat is None or lng is None:
            return Response({"error": "Latitude and longitude are required."}, status=400)

        try:
            lat = float(lat)
            lng = float(lng)
            radius_km = float(radius_km)
            if not (-90 <= lat <= 90) or not (-180 <= lng <= 180):
                return Response({"error": "Invalid geographic coordinates."}, status=400)
        except (ValueError, TypeError):
            return Response({"error": "Invalid coordinate format."}, status=400)

        # 1. User Ownership & Critical Alert Verification in PostgreSQL
        user = request.user
        critical_alerts = list(Alert.objects.filter(member__family__user=user, severity='Critical', status__in=['Active', 'Upcoming']))
        
        critical_lab_params = []
        user_reports = Report.objects.filter(member__family__user=user)
        for r in user_reports:
            for item in (r.lab_values or []):
                if isinstance(item, dict) and item.get('status') == 'Critical':
                    critical_lab_params.append({
                        "member": r.member.name if r.member else "User",
                        "parameter": item.get('parameter'),
                        "value": item.get('value'),
                        "unit": item.get('unit', ''),
                        "status": "Critical",
                        "date": str(r.date)
                    })

        if not critical_alerts and not critical_lab_params:
            return Response({
                "has_critical": False,
                "error": "No critical health alerts detected for account.",
                "facilities": []
            }, status=400)

        # 2. Fetch real nearby medical facilities from live Overpass/Nominatim API
        facilities = self._search_overpass_places(lat, lng, radius_km)

        # Fallback to Nominatim GIS search if Overpass is slow/empty
        if not facilities:
            facilities = self._search_nominatim_places(lat, lng)

        return Response({
            "has_critical": True,
            "critical_alerts_count": len(critical_alerts) + len(critical_lab_params),
            "facilities_count": len(facilities),
            "facilities": facilities
        })

    def _search_overpass_places(self, lat: float, lng: float, radius_km: float) -> list:
        radius_m = int(radius_km * 1000)
        overpass_url = "https://overpass-api.de/api/interpreter"

        query = f"""[out:json][timeout:6];(node["amenity"~"hospital|clinic|doctors"](around:{radius_m},{lat},{lng});way["amenity"~"hospital|clinic|doctors"](around:{radius_m},{lat},{lng}););out center 25;"""

        facilities = []
        generic_names = {"hospital", "clinic", "doctors", "medical center", "building", "doctor", "health center", "medical facility"}

        try:
            data_bytes = urllib.parse.urlencode({"data": query}).encode("utf-8")
            req = urllib.request.Request(
                overpass_url,
                data=data_bytes,
                headers={
                    "User-Agent": "NexolithCare/1.0 (HealthcareApp; contact@nexolith.com)",
                    "Content-Type": "application/x-www-form-urlencoded"
                },
                method="POST"
            )

            with urllib.request.urlopen(req, timeout=7) as resp:
                if resp.status == 200:
                    res_data = json.loads(resp.read().decode("utf-8"))
                    elements = res_data.get("elements", [])
                    
                    seen_names = set()
                    for elem in elements:
                        tags = elem.get("tags", {})
                        name = tags.get("name") or tags.get("name:en") or tags.get("official_name") or tags.get("operator") or tags.get("brand")
                        
                        plat = elem.get("lat") or (elem.get("center", {}).get("lat"))
                        plon = elem.get("lon") or (elem.get("center", {}).get("lon"))

                        if not plat or not plon or not name:
                            continue

                        name_clean = name.strip()
                        if name_clean.lower() in generic_names or len(name_clean) < 3 or name_clean.lower() in seen_names:
                            continue

                        seen_names.add(name_clean.lower())

                        amenity = tags.get("amenity", "hospital").lower()
                        if amenity == "hospital":
                            category = "Hospital"
                            priority = 1
                        elif amenity == "clinic":
                            category = "Clinic"
                            priority = 2
                        else:
                            category = "Medical Center"
                            priority = 3

                        dist = haversine_distance(lat, lng, float(plat), float(plon))
                        directions_url = f"https://www.google.com/maps/dir/?api=1&destination={plat},{plon}"

                        facilities.append({
                            "id": elem.get("id"),
                            "name": name_clean,
                            "category": category,
                            "priority": priority,
                            "distance_km": dist,
                            "latitude": float(plat),
                            "longitude": float(plon),
                            "directions_url": directions_url,
                            "phone": tags.get("phone") or tags.get("contact:phone") or None,
                            "emergency": tags.get("emergency") == "yes"
                        })

                    facilities.sort(key=lambda x: (x["priority"], x["distance_km"]))
        except Exception as e:
            logger.warning(f"NearbyCareView overpass search notice: {e}")

        return facilities

    def _search_nominatim_places(self, lat: float, lng: float) -> list:
        facilities = []
        generic_names = {"hospital", "clinic", "doctors", "medical center", "building", "doctor"}
        nom_url = f"https://nominatim.openstreetmap.org/search?format=json&q=hospital&lat={lat}&lon={lng}&limit=10"
        try:
            req = urllib.request.Request(
                nom_url,
                headers={"User-Agent": "NexolithCare/1.0 (HealthcareApp)"}
            )
            with urllib.request.urlopen(req, timeout=5) as resp:
                if resp.status == 200:
                    items = json.loads(resp.read().decode("utf-8"))
                    seen_names = set()
                    for item in items:
                        name = item.get("display_name", "").split(",")[0].strip()
                        plat = float(item.get("lat"))
                        plon = float(item.get("lon"))
                        if not name or name.lower() in generic_names or name.lower() in seen_names or len(name) < 3:
                            continue
                        seen_names.add(name.lower())

                        dist = haversine_distance(lat, lng, plat, plon)
                        directions_url = f"https://www.google.com/maps/dir/?api=1&destination={plat},{plon}"

                        facilities.append({
                            "id": item.get("place_id"),
                            "name": name,
                            "category": "Hospital",
                            "priority": 1,
                            "distance_km": dist,
                            "latitude": plat,
                            "longitude": plon,
                            "directions_url": directions_url,
                            "phone": None,
                            "emergency": True
                        })
                    facilities.sort(key=lambda x: x["distance_km"])
        except Exception as e:
            logger.warning(f"NearbyCareView nominatim search notice: {e}")

        return facilities
