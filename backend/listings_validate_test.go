package main

import (
	"encoding/json"
	"testing"
)

func validRentInput() listingInput {
	return listingInput{
		Deal: "rent", City: "yerevan", Street: "Test str", Price: 100000, Area: 40,
		Floor: 4, FloorsTotal: 9, CadastreCode: "CAD-1", RepairCondition: "good",
	}
}

func TestValidateListingInputAcceptsAValidRentListing(t *testing.T) {
	if err := validateListingInput(validRentInput()); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
}

func TestValidateListingInputRejectsZeroFloorsTotal(t *testing.T) {
	in := validRentInput()
	in.FloorsTotal = 0
	if err := validateListingInput(in); err != errFloorsTotalRange {
		t.Fatalf("err = %v, want errFloorsTotalRange", err)
	}
}

func TestValidateListingInputRejectsUnrealisticFloor(t *testing.T) {
	in := validRentInput()
	in.Floor = 999
	if err := validateListingInput(in); err != errFloorRange {
		t.Fatalf("err = %v, want errFloorRange", err)
	}
}

func TestValidateListingInputRejectsFloorAboveFloorsTotal(t *testing.T) {
	in := validRentInput()
	in.Floor = 10
	in.FloorsTotal = 9
	if err := validateListingInput(in); err != errFloorExceedsTotal {
		t.Fatalf("err = %v, want errFloorExceedsTotal", err)
	}
}

func TestValidateListingInputAcceptsTopFloor(t *testing.T) {
	in := validRentInput()
	in.Floor = 9
	in.FloorsTotal = 9
	if err := validateListingInput(in); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
}

func TestValidateListingInputRejectsUnrealisticArea(t *testing.T) {
	in := validRentInput()
	in.Area = maxListingArea + 1
	if err := validateListingInput(in); err != errAreaRange {
		t.Fatalf("err = %v, want errAreaRange", err)
	}
}

func TestValidateListingInputRejectsStreetOverLimit(t *testing.T) {
	in := validRentInput()
	long := ""
	for i := 0; i < maxStreetLen+1; i++ {
		long += "a"
	}
	in.Street = long
	if err := validateListingInput(in); err != errStreetTooLong {
		t.Fatalf("err = %v, want errStreetTooLong", err)
	}
}

func TestValidateListingInputRejectsDescriptionOverLimit(t *testing.T) {
	in := validRentInput()
	long := ""
	for i := 0; i < maxDescriptionLen+1; i++ {
		long += "a"
	}
	in.Description = long
	if err := validateListingInput(in); err != errDescriptionTooLong {
		t.Fatalf("err = %v, want errDescriptionTooLong", err)
	}
}

func TestValidateListingInputHotelSkipsAreaAndFloorChecks(t *testing.T) {
	in := listingInput{
		Deal: "hotel", City: "yerevan", Street: "Test str", Title: "Hotel",
		StayKind: "hostel", CheckIn: "14:00", CheckOut: "12:00",
	}
	if err := validateListingInput(in); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
}

func TestNormalizeListingInputCollapsesAndTrimsWhitespace(t *testing.T) {
	in := listingInput{Street: "  Abovyan   41  ", Description: "  hello   world  "}
	out := normalizeListingInput(in)
	if out.Street != "Abovyan 41" {
		t.Fatalf("street = %q, want %q", out.Street, "Abovyan 41")
	}
	if out.Description != "hello world" {
		t.Fatalf("description = %q, want %q", out.Description, "hello world")
	}
}

func TestCreateListingNormalizesStreetWhitespace(t *testing.T) {
	setupTestDB(t)
	setupTestPrivateDocs(t)
	owner := mustCreateUser(t, "tenant")

	in := validRentInput()
	in.Street = "  Abovyan   41  "
	b, _ := json.Marshal(in)
	req := newCreateListingRequest(t, string(b), "cert.pdf", pdfBytes)
	rec := createListingAs(t, owner, req)
	if rec.Code != 201 {
		t.Fatalf("status = %d, body = %s", rec.Code, rec.Body.String())
	}
	var out struct {
		Listing Listing `json:"listing"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &out); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if out.Listing.Street != "Abovyan 41" {
		t.Fatalf("street = %q, want %q", out.Listing.Street, "Abovyan 41")
	}
}
