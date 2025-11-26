#let resume = yaml("../data/resume.yaml")

#set page(
  paper: "us-letter",
  margin: (x: 1.25cm, y: 1.25cm),
)

#set text(
  font: "Linux Libertine",
  size: 10pt,
  lang: "en",
)

#let accent_color = rgb("#2563eb") // Blue-600
#let gray_color = rgb("#4b5563") // Gray-600

// --- Macros ---

#let section_title(title) = {
  v(8pt)
  text(weight: "bold", size: 12pt, fill: accent_color, upper(title))
  v(-2pt)
  line(length: 100%, stroke: 0.5pt + gray_color)
  v(4pt)
}

#let job_item(role, company, location, start, end, description) = {
  grid(
    columns: (1fr, auto),
    text(weight: "bold", size: 11pt, role), text(weight: "medium", start + " - " + end),
  )
  v(-2pt)
  grid(
    columns: (1fr, auto),
    text(style: "italic", fill: gray_color, company), text(style: "italic", fill: gray_color, location),
  )
  v(4pt)
  description
  v(8pt)
}

#let edu_item(degree, institution, location, year, description) = {
  grid(
    columns: (1fr, auto),
    text(weight: "bold", size: 11pt, degree), text(weight: "medium", year),
  )
  v(-2pt)
  grid(
    columns: (1fr, auto),
    text(style: "italic", fill: gray_color, institution), text(style: "italic", fill: gray_color, location),
  )
  v(2pt)
  if description != none {
    text(fill: gray_color, description)
  }
  v(6pt)
}

#let project_item(name, url, description) = {
  text(weight: "bold", size: 11pt, name)
  if url != none {
    " | " + link(url)[#text(fill: accent_color, url)]
  }
  linebreak()
  v(2pt)
  description
  v(6pt)
}

// --- Content ---

// Header
#align(center)[
  #text(weight: "bold", size: 22pt, fill: black, resume.name) \
  #v(2pt)
  #text(size: 12pt, weight: "medium", fill: accent_color, resume.title) \
  #v(6pt)
  #set text(size: 9pt, fill: gray_color)
  #resume.email | #resume.phone | #resume.location \
  #link("https://" + resume.linkedin)[LinkedIn] | #link("https://" + resume.github)[GitHub] | #link("https://" + resume.website)[Portfolio]
]

#v(10pt)

// Summary
#section_title("Professional Summary")
#resume.summary

// Experience
#section_title("Professional Experience")
#for job in resume.experience {
  job_item(job.role, job.company, job.location, job.start, job.end, job.description)
}

// Education
#section_title("Education")
#for edu in resume.education {
  edu_item(edu.degree, edu.institution, edu.location, edu.year, edu.description)
}

// Skills
#section_title("Technical Skills")
#grid(
  columns: (auto, 1fr),
  gutter: 10pt,
  row-gutter: 6pt,
  ..resume
    .skills
    .map(cat => (
      text(weight: "bold", cat.category + ":"),
      cat.items.join(", "),
    ))
    .flatten()
)

// Projects
#if "projects" in resume {
  section_title("Key Projects")
  for proj in resume.projects {
    project_item(proj.name, proj.url, proj.description)
  }
}

// Certifications
#if "certifications" in resume {
  section_title("Certifications")
  grid(
    columns: (1fr, auto),
    row-gutter: 6pt,
    ..resume
      .certifications
      .map(cert => (
        text(weight: "bold", cert.name) + text(fill: gray_color, " - " + cert.issuer),
        text(fill: gray_color, cert.date),
      ))
      .flatten()
  )
}
