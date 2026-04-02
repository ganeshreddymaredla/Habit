from django.shortcuts import render, redirect
from django.contrib.auth import login, logout, authenticate
from django.contrib.auth.models import User
from django.contrib import messages
from django.core.mail import send_mail
from django.conf import settings
from .forms import SignupForm, LoginForm
from .models import UserProfile


def signup_view(request):
    if request.user.is_authenticated:
        return redirect('dashboard')
    form = SignupForm(request.POST or None)
    if request.method == 'POST' and form.is_valid():
        user = User.objects.create_user(
            username=form.cleaned_data['username'],
            email=form.cleaned_data['email'],
            password=form.cleaned_data['password'],
        )
        UserProfile.objects.create(user=user, phone=form.cleaned_data['phone'])
        # Welcome email
        try:
            send_mail(
                subject='Welcome to HabitTracker!',
                message=(
                    f"Hi {user.username},\n\n"
                    "Welcome to HabitTracker! 🎉\n\n"
                    "Start building powerful daily habits and track your streaks.\n\n"
                    "Login at any time to check your progress.\n\n"
                    "— The HabitTracker Team"
                ),
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user.email],
                fail_silently=True,
            )
        except Exception:
            pass  # Don't block signup if email fails
        messages.success(request, 'Account created! Please log in.')
        return redirect('login')
    return render(request, 'accounts/signup.html', {'form': form})


def login_view(request):
    if request.user.is_authenticated:
        return redirect('dashboard')
    form = LoginForm(request, data=request.POST or None)
    if request.method == 'POST':
        if form.is_valid():
            user = form.get_user()
            login(request, user)
            return redirect('dashboard')
        else:
            messages.error(request, 'Invalid username or password.')
    return render(request, 'accounts/login.html', {'form': form})


def logout_view(request):
    logout(request)
    messages.info(request, 'You have been logged out.')
    return redirect('login')


def theme_toggle(request):
    """Save theme preference to user profile."""
    if request.user.is_authenticated:
        profile, _ = UserProfile.objects.get_or_create(user=request.user)
        profile.theme = 'dark' if profile.theme == 'light' else 'light'
        profile.save()
    return redirect(request.META.get('HTTP_REFERER', 'dashboard'))
