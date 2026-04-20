export type Difficulty = "simple" | "medium" | "complex";

export interface FormEntry {
  id: string;
  name: string;
  file: string;
  difficulty: Difficulty;
  fieldCount: number;
}

export const FORMS_REGISTRY: FormEntry[] = [
  // ── Simple ──────────────────────────────────────────────────────────────────
  { id: "01", name: "Contact Form",            file: "simple/01-contact.html",            difficulty: "simple",  fieldCount: 5  },
  { id: "02", name: "Newsletter Signup",       file: "simple/02-newsletter.html",         difficulty: "simple",  fieldCount: 3  },
  { id: "03", name: "Account Registration",   file: "simple/03-registration.html",       difficulty: "simple",  fieldCount: 6  },
  { id: "04", name: "Shipping Address",        file: "simple/04-shipping.html",           difficulty: "simple",  fieldCount: 6  },
  { id: "05", name: "Event RSVP",              file: "simple/05-rsvp.html",               difficulty: "simple",  fieldCount: 5  },
  { id: "06", name: "Feedback Form",           file: "simple/06-feedback.html",           difficulty: "simple",  fieldCount: 5  },
  // ── Medium ───────────────────────────────────────────────────────────────────
  { id: "07", name: "Job Application – Basic", file: "medium/07-job-basic.html",          difficulty: "medium",  fieldCount: 9  },
  { id: "08", name: "Conference Registration", file: "medium/08-conference.html",         difficulty: "medium",  fieldCount: 8  },
  { id: "09", name: "Medical Intake",          file: "medium/09-medical.html",            difficulty: "medium",  fieldCount: 10 },
  { id: "10", name: "Student Enrollment",      file: "medium/10-enrollment.html",         difficulty: "medium",  fieldCount: 9  },
  { id: "11", name: "Rental Application",      file: "medium/11-rental.html",             difficulty: "medium",  fieldCount: 10 },
  { id: "12", name: "Scholarship Application", file: "medium/12-scholarship.html",        difficulty: "medium",  fieldCount: 7  },
  { id: "13", name: "Professional Profile",    file: "medium/13-professional-profile.html", difficulty: "medium", fieldCount: 8 },
  // ── Complex ──────────────────────────────────────────────────────────────────
  { id: "14", name: "Multi-Section Job App",   file: "complex/14-multi-section-job.html", difficulty: "complex", fieldCount: 20 },
  { id: "15", name: "Conditional Form",        file: "complex/15-conditional.html",       difficulty: "complex", fieldCount: 9  },
  { id: "16", name: "Software Eng Application",file: "complex/16-software-eng.html",      difficulty: "complex", fieldCount: 13 },
  { id: "17", name: "Grad School Application", file: "complex/17-grad-school.html",       difficulty: "complex", fieldCount: 13 },
  { id: "18", name: "Health Insurance Enroll", file: "complex/18-health-insurance.html",  difficulty: "complex", fieldCount: 13 },
  { id: "19", name: "Multi-Step Wizard",       file: "complex/19-wizard.html",            difficulty: "complex", fieldCount: 14 },
  { id: "20", name: "Research Grant App",      file: "complex/20-grant.html",             difficulty: "complex", fieldCount: 12 },
];
