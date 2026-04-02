from django import forms
from .models import Habit


class HabitForm(forms.ModelForm):
    class Meta:
        model = Habit
        fields = ('name', 'description', 'category')
        widgets = {
            'name': forms.TextInput(attrs={'placeholder': 'e.g. Morning run'}),
            'description': forms.Textarea(attrs={'rows': 2, 'placeholder': 'Optional details…'}),
        }

    def __init__(self, *args, user=None, **kwargs):
        self.user = user
        super().__init__(*args, **kwargs)

    def clean_name(self):
        name = self.cleaned_data['name']
        qs = Habit.objects.filter(user=self.user, name__iexact=name)
        if self.instance.pk:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise forms.ValidationError('You already have a habit with this name.')
        return name
