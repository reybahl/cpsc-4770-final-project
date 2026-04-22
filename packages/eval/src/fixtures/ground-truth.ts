/**
 * Per-field expected values for every eval form, keyed by the HTML `name` attribute.
 *
 * Matcher types:
 *   exact    – case-insensitive equality after trim
 *   contains – all listed substrings must appear (case-insensitive)
 *   any-of   – at least one listed value must match (case-insensitive equality or contains)
 *   phone    – digit-normalized equality
 *   nonempty – value must be non-blank (agent wrote something)
 *   skip     – field excluded from accuracy calculation (password, SSN, etc.)
 */

export type MatchType =
  | "exact"
  | "contains"
  | "any-of"
  | "phone"
  | "nonempty"
  | "skip";

export interface FieldMatcher {
  type: MatchType;
  value?: string;
  values?: string[];
}

export type FormGroundTruth = Record<string, FieldMatcher>;

export const GROUND_TRUTH: Record<string, FormGroundTruth> = {
  // ── 01 Contact ──────────────────────────────────────────────────────────────
  "01": {
    firstName: { type: "exact", value: "Alex" },
    lastName: { type: "exact", value: "Johnson" },
    email: { type: "exact", value: "alex.johnson@example.com" },
    phone: { type: "phone", value: "4155550192" },
    message: { type: "nonempty" },
  },
  // ── 02 Newsletter ────────────────────────────────────────────────────────────
  "02": {
    fullName: { type: "contains", values: ["alex", "johnson"] },
    email: { type: "exact", value: "alex.johnson@example.com" },
    frequency: { type: "skip" },
  },
  // ── 03 Registration ──────────────────────────────────────────────────────────
  "03": {
    firstName: { type: "exact", value: "Alex" },
    lastName: { type: "exact", value: "Johnson" },
    email: { type: "exact", value: "alex.johnson@example.com" },
    username: { type: "skip" },
    password: { type: "skip" },
    confirmPassword: { type: "skip" },
  },
  // ── 04 Shipping ──────────────────────────────────────────────────────────────
  "04": {
    recipientName: { type: "contains", values: ["alex", "johnson"] },
    streetAddress: { type: "contains", values: ["742"] },
    city: { type: "exact", value: "san francisco" },
    state: { type: "any-of", values: ["ca", "california"] },
    zipCode: { type: "exact", value: "94102" },
    country: { type: "contains", values: ["united states"] },
  },
  // ── 05 RSVP ──────────────────────────────────────────────────────────────────
  "05": {
    fullName: { type: "contains", values: ["alex", "johnson"] },
    email: { type: "exact", value: "alex.johnson@example.com" },
    attending: { type: "nonempty" },
    guestCount: { type: "nonempty" },
    dietaryRestrictions: { type: "contains", values: ["vegetarian"] },
  },
  // ── 06 Feedback ──────────────────────────────────────────────────────────────
  "06": {
    name: { type: "contains", values: ["alex", "johnson"] },
    email: { type: "exact", value: "alex.johnson@example.com" },
    rating: { type: "nonempty" },
    category: { type: "nonempty" },
    comments: { type: "nonempty" },
  },
  // ── 07 Job Basic ─────────────────────────────────────────────────────────────
  "07": {
    firstName: { type: "exact", value: "Alex" },
    lastName: { type: "exact", value: "Johnson" },
    email: { type: "exact", value: "alex.johnson@example.com" },
    phone: { type: "phone", value: "4155550192" },
    positionApplied: { type: "nonempty" },
    earliestStartDate: { type: "nonempty" },
    expectedSalary: { type: "nonempty" },
    workAuthorization: { type: "contains", values: ["yes"] },
    hearAboutUs: { type: "skip" },
  },
  // ── 08 Conference ────────────────────────────────────────────────────────────
  "08": {
    fullName: { type: "contains", values: ["alex", "johnson"] },
    email: { type: "exact", value: "alex.johnson@example.com" },
    organization: { type: "nonempty" },
    jobTitle: { type: "contains", values: ["engineer"] },
    dietaryPreference: { type: "any-of", values: ["vegetarian"] },
    tshirtSize: { type: "any-of", values: ["l", "large"] },
    workshopChoice: { type: "skip" },
    badgeName: { type: "contains", values: ["alex"] },
  },
  // ── 09 Medical ───────────────────────────────────────────────────────────────
  "09": {
    firstName: { type: "exact", value: "Alex" },
    lastName: { type: "exact", value: "Johnson" },
    dateOfBirth: {
      type: "any-of",
      values: ["1995-03-15", "03/15/1995", "03-15-1995", "march 15"],
    },
    insuranceProvider: { type: "nonempty" },
    insuranceMemberId: { type: "skip" },
    primaryPhysician: { type: "nonempty" },
    currentMedications: { type: "nonempty" },
    knownAllergies: { type: "nonempty" },
    emergencyContactName: { type: "nonempty" },
    emergencyContactPhone: { type: "nonempty" },
  },
  // ── 10 Enrollment ────────────────────────────────────────────────────────────
  "10": {
    firstName: { type: "exact", value: "Alex" },
    lastName: { type: "exact", value: "Johnson" },
    email: { type: "exact", value: "alex.johnson@example.com" },
    phone: { type: "phone", value: "4155550192" },
    intendedMajor: { type: "contains", values: ["computer"] },
    degreeLevel: { type: "nonempty" },
    startTerm: { type: "nonempty" },
    currentGPA: { type: "contains", values: ["3.7"] },
    transferStudent: { type: "nonempty" },
  },
  // ── 11 Rental ────────────────────────────────────────────────────────────────
  "11": {
    firstName: { type: "exact", value: "Alex" },
    lastName: { type: "exact", value: "Johnson" },
    email: { type: "exact", value: "alex.johnson@example.com" },
    phone: { type: "phone", value: "4155550192" },
    currentAddress: { type: "contains", values: ["742"] },
    currentCity: { type: "contains", values: ["francisco"] },
    currentState: { type: "any-of", values: ["ca", "california"] },
    currentEmployer: { type: "nonempty" },
    monthlyGrossIncome: { type: "nonempty" },
    desiredMoveIn: { type: "nonempty" },
  },
  // ── 12 Scholarship ───────────────────────────────────────────────────────────
  "12": {
    fullName: { type: "contains", values: ["alex", "johnson"] },
    email: { type: "exact", value: "alex.johnson@example.com" },
    institution: { type: "contains", values: ["berkeley"] },
    major: { type: "contains", values: ["computer"] },
    cumulativeGPA: { type: "contains", values: ["3.7"] },
    financialNeed: { type: "nonempty" },
    essayResponse: { type: "nonempty" },
  },
  // ── 13 Professional Profile ──────────────────────────────────────────────────
  "13": {
    fullName: { type: "contains", values: ["alex", "johnson"] },
    professionalTitle: { type: "contains", values: ["engineer"] },
    currentEmployer: { type: "nonempty" },
    bio: { type: "nonempty" },
    personalWebsite: { type: "contains", values: ["alexjohnson"] },
    linkedinUrl: { type: "contains", values: ["linkedin"] },
    technicalSkills: { type: "nonempty" },
    yearsOfExperience: { type: "contains", values: ["7"] },
  },
  // ── 14 Multi-Section Job ─────────────────────────────────────────────────────
  "14": {
    // Personal
    firstName: { type: "exact", value: "Alex" },
    lastName: { type: "exact", value: "Johnson" },
    email: { type: "exact", value: "alex.johnson@example.com" },
    phone: { type: "phone", value: "4155550192" },
    streetAddress: { type: "contains", values: ["742"] },
    city: { type: "exact", value: "san francisco" },
    state: { type: "any-of", values: ["ca", "california"] },
    zipCode: { type: "exact", value: "94102" },
    // Education
    institutionName: { type: "contains", values: ["berkeley"] },
    degreeType: { type: "nonempty" },
    majorField: { type: "contains", values: ["computer"] },
    graduationYear: { type: "exact", value: "2017" },
    educationGPA: { type: "contains", values: ["3.7"] },
    // Experience
    mostRecentEmployer: { type: "nonempty" },
    mostRecentTitle: { type: "nonempty" },
    mostRecentStartDate: { type: "nonempty" },
    mostRecentEndDate: { type: "nonempty" },
    previousEmployer: { type: "nonempty" },
    previousTitle: { type: "nonempty" },
    // Skills
    technicalSkillsList: { type: "nonempty" },
    githubProfileUrl: { type: "contains", values: ["github"] },
    coverLetterText: { type: "nonempty" },
  },
  // ── 15 Conditional ───────────────────────────────────────────────────────────
  "15": {
    firstName: { type: "exact", value: "Alex" },
    lastName: { type: "exact", value: "Johnson" },
    email: { type: "exact", value: "alex.johnson@example.com" },
    phone: { type: "phone", value: "4155550192" },
    employmentStatus: { type: "any-of", values: ["employed", "self-employed"] },
    employerName: { type: "nonempty" },
    yourPosition: { type: "nonempty" },
    employerCity: { type: "nonempty" },
    annualIncome: { type: "nonempty" },
  },
  // ── 16 Software Eng ──────────────────────────────────────────────────────────
  "16": {
    fullName: { type: "contains", values: ["alex", "johnson"] },
    email: { type: "exact", value: "alex.johnson@example.com" },
    phone: { type: "phone", value: "4155550192" },
    githubUrl: { type: "contains", values: ["github"] },
    portfolioUrl: { type: "nonempty" },
    currentEmployer: { type: "nonempty" },
    currentRole: { type: "contains", values: ["engineer"] },
    primaryLanguages: { type: "nonempty" },
    yearsExperience: { type: "contains", values: ["7"] },
    openSourceContributions: { type: "nonempty" },
    whyThisRole: { type: "nonempty" },
    salaryExpectation: { type: "nonempty" },
    availableStartDate: { type: "nonempty" },
  },
  // ── 17 Grad School ───────────────────────────────────────────────────────────
  "17": {
    firstName: { type: "exact", value: "Alex" },
    lastName: { type: "exact", value: "Johnson" },
    email: { type: "exact", value: "alex.johnson@example.com" },
    phone: { type: "phone", value: "4155550192" },
    undergradInstitution: { type: "contains", values: ["berkeley"] },
    undergradMajor: { type: "contains", values: ["computer"] },
    undergradGPA: { type: "contains", values: ["3.7"] },
    greVerbalScore: { type: "nonempty" },
    greQuantScore: { type: "nonempty" },
    greWritingScore: { type: "nonempty" },
    desiredProgram: { type: "nonempty" },
    statementOfPurpose: { type: "nonempty" },
    researchInterests: { type: "nonempty" },
  },
  // ── 18 Health Insurance ──────────────────────────────────────────────────────
  "18": {
    firstName: { type: "exact", value: "Alex" },
    lastName: { type: "exact", value: "Johnson" },
    dateOfBirth: {
      type: "any-of",
      values: ["1995-03-15", "03/15/1995", "03-15-1995"],
    },
    ssnLast4: { type: "skip" },
    employmentStatus: { type: "any-of", values: ["employed", "self-employed"] },
    employerName: { type: "nonempty" },
    planType: { type: "nonempty" },
    deductiblePreference: { type: "nonempty" },
    primaryCarePhysician: { type: "nonempty" },
    numberOfDependents: { type: "nonempty" },
    coverageStartDate: { type: "nonempty" },
    emergencyContactName: { type: "nonempty" },
    emergencyContactPhone: { type: "nonempty" },
    emergencyContactRelationship: { type: "nonempty" },
    tobaccoUser: { type: "nonempty" },
  },
  // ── 19 Multi-Step Wizard ─────────────────────────────────────────────────────
  "19": {
    // Step 1
    firstName: { type: "exact", value: "Alex" },
    lastName: { type: "exact", value: "Johnson" },
    email: { type: "exact", value: "alex.johnson@example.com" },
    phone: { type: "phone", value: "4155550192" },
    // Step 2
    universityName: { type: "contains", values: ["berkeley"] },
    degreeType: { type: "nonempty" },
    fieldOfStudy: { type: "contains", values: ["computer"] },
    graduationYear: { type: "exact", value: "2017" },
    // Step 3
    currentCompany: { type: "nonempty" },
    currentRole: { type: "nonempty" },
    employmentStartDate: { type: "nonempty" },
    totalYearsExperience: { type: "contains", values: ["7"] },
    // Step 4
    technicalSkills: { type: "nonempty" },
    professionalSummary: { type: "nonempty" },
  },
  // ── 20 Research Grant ────────────────────────────────────────────────────────
  "20": {
    piFirstName: { type: "exact", value: "Alex" },
    piLastName: { type: "exact", value: "Johnson" },
    piEmail: { type: "exact", value: "alex.johnson@example.com" },
    piInstitution: { type: "nonempty" },
    piTitle: { type: "contains", values: ["engineer"] },
    projectTitle: { type: "nonempty" },
    projectAbstract: { type: "nonempty" },
    specificAims: { type: "nonempty" },
    humanSubjectsResearch: { type: "any-of", values: ["yes", "no"] },
    projectDuration: { type: "nonempty" },
    requestedFunding: { type: "nonempty" },
    budgetJustification: { type: "nonempty" },
    expectedImpact: { type: "nonempty" },
  },
};
