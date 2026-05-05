# Privacy Policy

**Effective date:** May 5, 2026
**Last updated:** May 5, 2026

This Privacy Policy explains how **MoMo** ("MoMo," "we," "us," or "our")
collects, uses, shares, and protects information when you use our chat-based
expense-tracking application (the "Service"). It also describes the rights
you have over your personal information.

> **About MoMo.** MoMo is a free, non-commercial hobby project built and
> operated by an individual in Colombia and shared with friends, family,
> and anyone they decide to invite. There is no company behind it, no
> paid subscription, no advertising, and no funding. We try to take your
> data seriously anyway — that's what this Policy is for.

If you have questions or want to exercise any right described below, contact
**Juan Ospina** at **juan.ospina.quintero@gmail.com**.

---

## 1. Who we are

MoMo is operated by **Juan Ospina**, an individual residing in Colombia
("the Operator"). The Operator is the **data controller** (responsable del
tratamiento) of personal information you provide through the Service.

There is no separate company, legal entity, or Data Protection Officer.
Privacy questions go directly to juan.ospina.quintero@gmail.com.

## 2. Scope

This Policy applies to information processed in connection with the MoMo
web application, our authentication flow, household invitation flow, and any
support communications you send us.

It does **not** apply to third-party services you reach through links from
MoMo, or to data you choose to keep outside the Service.

## 3. Information we collect

We try to collect only what is necessary to operate the Service. The
categories below reflect what MoMo actually processes today.

### 3.1 Information you provide directly

- **Account identity (via Google).** When you sign in with Google, we
  receive your name and email address from Google's OAuth response. We do
  not collect your Google password. You can revoke MoMo's access from your
  [Google Account permissions page](https://myaccount.google.com/permissions).
- **Profile information.** A display name, username, and email are stored
  in your MoMo profile. A unique invite token is generated for you to share
  with household members; it is not personally identifying on its own.
- **Preferences.** Your selected currency, language, onboarding status, and
  feature toggles.
- **Household membership.** If you create or join a household, we store the
  link between your account and that household, and your role (owner or
  member). Households are limited to 5 members.
- **Expense content.** The chat messages you send and the structured
  expenses parsed from them, including amount, currency, date, optional
  merchant, optional note, category, and tags. Free-text messages may
  include whatever you choose to type — please avoid putting sensitive
  information (e.g., government IDs, health data, payment card numbers) in
  chat messages.
- **Support communications.** Any information you send us by email when
  asking for help or exercising privacy rights.

### 3.2 Information collected automatically

- **Authentication and session data.** Cookies and tokens issued by our
  authentication provider (Supabase) to keep you signed in.
- **Operational logs.** Our hosting and database providers automatically
  process basic technical data (IP address, request timestamps, error
  details) to keep the Service running and secure. MoMo does not maintain a
  separate analytics pipeline; we do not run product analytics, advertising,
  or behavioral tracking.

### 3.3 Cookies and similar technologies

MoMo uses **only strictly necessary / functional cookies**. We do not use
advertising cookies, analytics cookies, or cross-site tracking technologies.

| Cookie | Purpose | Type | Lifetime |
| --- | --- | --- | --- |
| `sb-*` (Supabase auth) | Keeps you signed in and lets the server identify your session | Strictly necessary | Session / refresh-token lifetime |
| `NEXT_LOCALE` | Remembers the language you picked | Functional preference | Up to 1 year |
| `invite_token` | Carries a household invite token through the sign-in redirect | Strictly necessary | Cleared at the end of the invite flow |

Because MoMo deploys only essential cookies, no cookie-consent banner is
required in most jurisdictions.

### 3.4 What we do not collect

We do not collect or use:

- advertising or marketing identifiers,
- third-party analytics, behavioral tracking, or fingerprinting,
- biometric or precise-location data,
- payment card data (the Service is free),
- data from public social media beyond your Google sign-in.

## 4. How we use information

We use personal information for the following purposes. We have indicated
the legal basis for users covered by Colombian Law 1581 of 2012, the EU/UK
GDPR, or analogous laws.

| Purpose | Examples | Legal basis |
| --- | --- | --- |
| Provide the Service | Authenticate you, render your expenses, deliver real-time updates within your household | Your authorization to use the Service / performance of the user agreement |
| Operate and secure the Service | Detect abuse, debug errors, enforce rate limits | Legitimate interest of the Operator |
| Communicate with you | Respond to support requests and privacy requests | Performance of the user agreement |
| Comply with legal obligations | Respond to lawful requests | Legal obligation |

We do **not** sell your personal information, share it for cross-context
behavioral advertising, or use it to train third-party AI models. MoMo does
not currently call any external large-language-model API as part of expense
parsing; categorization is performed on our servers using a deterministic
dictionary algorithm.

## 5. How information is shared

We share personal information only as described below.

- **Within your household.** When you choose to participate in a household,
  the chat messages and expenses you mark as household-scoped are visible
  to other members of that household. Personal-scope messages and expenses
  are visible only to you. This boundary is enforced by Postgres
  row-level-security policies inside our database (see Section 8 for
  details), not just by the application.
- **Service providers (encargados del tratamiento / processors).** We use
  the following sub-processors to run the Service. They process information
  under our instructions:
  - **Supabase Inc.** — authentication, Postgres database, real-time, and
    storage of MoMo data. Data is stored in Supabase's **United States
    region**.
  - **Google LLC** — identity provider for sign-in (we do not transmit your
    expense data to Google).
  - **Vercel** as hosting provider for serving the web application.
- **Legal and safety.** We may disclose information if required by law,
  judicial order, or other valid legal process from Colombian or foreign
  authorities, or when we believe in good faith that disclosure is
  necessary to protect rights, property, or safety.
- **Voluntary transfer.** If MoMo ever stops being a hobby project and
  becomes operated by a different person or entity, personal information
  may be transferred to that successor. We will notify you before your
  information becomes subject to a different privacy policy.

We do not sell or rent personal information.

## 6. International data transfers

MoMo stores user data in **Supabase's United States region**, while the
Operator is located in Colombia. This means your information will be
transferred internationally as a normal part of using the Service.

- **For users in Colombia.** Under Article 26 of Law 1581 of 2012 and
  Decree 1377 of 2013, by accepting this Policy you provide express
  authorization for MoMo to transfer your personal data internationally
  (including to the United States) to the sub-processors listed in
  Section 5, for the purposes described in this Policy.
- **For users in the EEA, UK, or Switzerland.** Where required, we rely
  on **Standard Contractual Clauses** (and the UK addendum, where
  applicable) entered into with our sub-processors as the transfer
  mechanism for personal data exported from those regions. You may request
  a copy of the relevant transfer safeguards by emailing
  juan.ospina.quintero@gmail.com.

## 7. Data retention

We retain personal information for as long as your account is active and
as needed to provide the Service.

- **Account, profile, preferences, household membership** — retained while
  your account exists.
- **Chat messages and expenses** — retained while your account exists, so
  you can review your historical spending. Expenses scoped to a household
  remain visible to remaining household members if you leave the household
  or close your account, unless you request deletion.
- **Operational logs** — retained for the period set by our hosting and
  database providers (typically up to 30 days for request logs).
- **Backups** — encrypted database backups may persist for a short rolling
  window after deletion before being overwritten.

If you stop using MoMo without closing your account, we may retain your
data indefinitely so the Service is available the next time you sign in.
You can request deletion at any time (see Section 9).

## 8. Security

We take reasonable technical and organizational measures to protect your
personal data, in line with Article 17(d) of Colombian Law 1581 of 2012
and Article 32 of the GDPR. The main measures currently in place are:

- **Encryption in transit.** All traffic to and from the Service uses
  HTTPS/TLS.
- **Encryption at rest.** Stored data is encrypted at rest by our database
  provider (Supabase).
- **Authentication via Google OAuth.** MoMo never sees or stores your
  Google password; sessions are managed through signed, short-lived
  tokens issued by our authentication provider.
- **Database-enforced access control via Row-Level Security (RLS).** Every
  data table in MoMo (chat messages, expenses, profiles, preferences,
  households, household members) has RLS policies enabled in Postgres.
  These policies are evaluated by the database itself on every query and
  enforce that:
  - personal-scope data (`household_id IS NULL`) is only readable by the
    user who created it;
  - household-scope data is only readable by users who are members of
    that household, validated through dedicated membership-check
    functions;
  - users may only update or delete rows they own.
  This means that even if a bug in the application code accidentally
  asked for someone else's data, the database would refuse to return it.
- **Defense-in-depth on household membership.** Constraints such as
  one-household-per-user and a five-member cap are enforced both at the
  database (unique index plus triggers) and at the application layer.
- **Minimum-privilege design.** Helper database functions that need
  elevated privileges run with `SECURITY DEFINER` only for narrow,
  well-scoped lookups (e.g., resolving an invite token), so they cannot
  be misused to read arbitrary data.
- **No analytics or tracking pipeline.** Because MoMo does not run
  third-party analytics, advertising, or tracking, your data is not
  shipped to vendors that could become a separate breach surface.

MoMo is a personal hobby project run by one person, and no service can
guarantee absolute security. **You use the Service at your own risk.** If
we become aware of a personal-data breach that affects you, we will
notify you and the relevant authorities (including the Superintendencia
de Industria y Comercio for Colombian users) to the extent required by
applicable law.

## 9. Your privacy rights

Depending on where you live, you may have some or all of the following
rights. We honor these rights regardless of jurisdiction where it is
operationally reasonable.

- **Know / access (conocer y acceder)** — request a copy of the personal
  information we hold about you.
- **Correction (rectificar)** — ask us to fix information that is
  inaccurate or incomplete.
- **Update (actualizar)** — ask us to update outdated information.
- **Deletion / "right to be forgotten" (suprimir)** — ask us to delete
  your personal information, subject to limited exceptions (e.g., legal
  record-keeping or where processing is mandated by law).
- **Portability** — request your data in a structured, machine-readable
  format.
- **Withdraw authorization (revocar la autorización)** — withdraw your
  consent at any time without affecting the lawfulness of prior
  processing.
- **Restriction or objection** — ask us to stop or limit certain
  processing.
- **Lodge a complaint** — Colombian residents may file a complaint with
  the **Superintendencia de Industria y Comercio (SIC)** at
  [www.sic.gov.co](https://www.sic.gov.co), after first submitting a
  request to us. EU residents can file with their local Data Protection
  Authority. California residents can contact the California Privacy
  Protection Agency.

### 9.1 How to make a request

MoMo does **not yet provide a self-serve "delete account" button in the
app**. Until we ship that, you can exercise any of the rights above by
emailing **juan.ospina.quintero@gmail.com** from the email address tied
to your MoMo account.

We will:

- acknowledge your request promptly,
- respond within **15 business days** for Colombian "consulta" requests
  and **15 business days** (extendable to 8 additional business days) for
  "reclamo" requests under Colombian law,
- respond within **30 days** (extendable by 60 days for complex requests)
  for GDPR / CCPA requests,
- not charge a fee unless your request is manifestly unfounded or
  excessive, and
- not discriminate against you for exercising your rights.

Because MoMo does not sell personal information or share it for
cross-context behavioral advertising, there is no separate "Do Not Sell or
Share My Personal Information" link to honor; sale and sharing are simply
not part of how the Service works.

### 9.2 Authorized agents

You may appoint someone to make a request on your behalf. We will require
written proof of that person's authority and may verify the request
directly with you.

### 9.3 Household data

Expenses scoped to a household are visible to all household members. If
you ask us to delete your account, we will delete information that is
uniquely yours (profile, personal-scope messages and expenses,
preferences). For expenses that are part of shared household activity, we
may retain those records in the household so other members are not left
with corrupted spending history; we will, on request, anonymize the
sender label so you are no longer associated with them.

## 10. Children's privacy

MoMo is not directed to children under 13 (or under 16 in the EEA / UK).
Under Colombian law, children's personal data may only be processed when
it respects the prevailing interest of the child and their fundamental
rights, with authorization from a parent or legal guardian. We do not
knowingly collect personal information from children. If you believe a
child has provided personal information to MoMo, please contact us and we
will delete it.

## 11. Automated decision-making

MoMo does not make decisions that produce legal or similarly significant
effects about you using solely automated processing. The categorization
of your expenses is performed by a deterministic dictionary algorithm and
is fully editable by you.

## 12. Region-specific disclosures

### 12.1 Colombia (Ley 1581 de 2012, Decreto 1377 de 2013)

The Operator is the **responsable del tratamiento** of your personal
information under Colombian data-protection law. By creating an account,
you provide your prior, express, and informed authorization for MoMo to
process your personal data for the purposes described in Section 4 and to
transfer it internationally as described in Section 6.

You may exercise the rights of *conocer, actualizar, rectificar,
suprimir y revocar* at any time by emailing
juan.ospina.quintero@gmail.com. If you believe we have failed to address
your request adequately, you may file a complaint with the
**Superintendencia de Industria y Comercio (SIC)**.

### 12.2 European Economic Area, United Kingdom, and Switzerland

Section 4 identifies the legal bases on which we rely. You have the
rights described in Section 9 under the GDPR / UK GDPR / FADP, including
the right to lodge a complaint with your local supervisory authority.

We have not designated a representative under Article 27 GDPR because
MoMo is a non-commercial hobby project operated by a single individual,
which qualifies for the derogations of Art. 27(2). We will appoint a
representative if our scale of processing changes.

### 12.3 California (CCPA / CPRA)

In the prior 12 months, MoMo has collected the categories of personal
information described in Section 3 (identifiers, internet/network
activity from auth and logs, commercial information about expenses you
choose to record, and inferences in the form of expense categories). We
use those categories for the business purposes described in Section 4.
We have **not** sold or shared (for cross-context behavioral advertising)
personal information in the prior 12 months, and have no plans to do so.
We do not knowingly collect or sell the personal information of consumers
under 16. California residents have the rights described in Section 9.

### 12.4 Other US states

If you are a resident of Virginia, Colorado, Connecticut, Utah, Texas, or
another US state with a comprehensive privacy law, you may exercise the
applicable rights described in Section 9 by emailing the contact address
above.

## 13. Changes to this Policy

We may update this Policy from time to time. When we make material
changes, we will update the "Last updated" date at the top and, where
appropriate, notify you in-app or by email. Your continued use of the
Service after the effective date of the updated Policy constitutes
acceptance.

## 14. Contact

For privacy questions, requests, or complaints, email **Juan Ospina** at
**juan.ospina.quintero@gmail.com**.

---

*This Privacy Policy is provided for informational purposes only and does
not constitute legal advice. MoMo is a personal hobby project; if you
intend to rely on this Policy in a commercial context, please have it
reviewed by qualified counsel licensed in your jurisdiction.*
