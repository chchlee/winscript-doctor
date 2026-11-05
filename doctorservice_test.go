package main

import "testing"

func TestDialogLanguagePreference(t *testing.T) {
	service := &DoctorService{}
	if service.text("English", "한국어") != "English" {
		t.Fatal("dialog language must default to English")
	}
	if !service.SetLanguage("ko") || service.text("English", "한국어") != "한국어" {
		t.Fatal("Korean language selection was not applied")
	}
	if service.SetLanguage("unsupported") || service.text("English", "한국어") != "한국어" {
		t.Fatal("invalid language changed the selected language")
	}
	if !service.SetLanguage("en") || service.text("English", "한국어") != "English" {
		t.Fatal("English language selection was not applied")
	}
}
