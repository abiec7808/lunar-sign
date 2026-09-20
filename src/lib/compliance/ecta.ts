/**
 * South African Electronic Communications and Transactions Act 25 of 2002 ("ECTA")
 * Compliance Specifications & Mandatory Legal Text
 */

export const ECTA_LEGAL_NOTICE_TEMPLATE = `Electronic Signature — Legal Notice
This document was signed electronically using {app_name}.
Legal framework: The signatures affixed to this document are electronic signatures as contemplated in section 1 of the Electronic Communications and Transactions Act 25 of 2002 ("ECTA"). In terms of section 13(2) and 13(3) of ECTA, an electronic signature is valid where a method is used to identify the person and to indicate that person's approval of the information communicated, and where that method was as reliable as was appropriate for the purpose for which the information was communicated.
Legal recognition: In terms of section 11 of ECTA, information is not without legal force and effect merely on the grounds that it is in the form of a data message. In terms of section 15 of ECTA, a data message made in the ordinary course of business is admissible in evidence and rebuttably presumed to be correct.
Integrity: The integrity of this document is protected by a SHA-256 cryptographic hash recorded in the audit trail below. Any alteration to the document after signing will change this hash and can be detected at {verification_url}.
Consent: Each signatory expressly consented to transact and sign electronically before signing, as recorded in the audit trail.
Advanced electronic signatures: This platform issues ordinary electronic signatures. Where a law specifically requires an advanced electronic signature as defined in section 13(1) of ECTA, that signature must be issued by a certification service provider accredited by the South African Accreditation Authority in terms of section 37 of ECTA.`;

export interface EctaExclusion {
  id: string;
  title: string;
  act: string;
  description: string;
}

export const ECTA_SCHEDULE_2_EXCLUSIONS: EctaExclusion[] = [
  {
    id: 'wills',
    title: 'Wills & Codicils',
    act: 'Wills Act 7 of 1953',
    description: 'Execution of a will or codicil cannot be completed by standard electronic signature under South African law.',
  },
  {
    id: 'alienation_of_land',
    title: 'Alienation of Immovable Property (Sale of Land)',
    act: 'Alienation of Land Act 68 of 1981',
    description: 'Agreements for the alienation of land/real estate require wet physical ink signatures.',
  },
  {
    id: 'long_term_lease',
    title: 'Long-term Leases of Immovable Property',
    act: 'Formalities in Respect of Leases of Land Act 18 of 1969',
    description: 'Leases of immovable property exceeding a period of 20 years.',
  },
  {
    id: 'bills_of_exchange',
    title: 'Bills of Exchange & Promissory Notes',
    act: 'Bills of Exchange Act 34 of 1964',
    description: 'Bills of exchange, promissory notes, and cheques require handwritten physical signatures.',
  },
];

export const ECTA_SPECIAL_FORMALITY_NOTICE = `Notice on Formalities: Certain legal documents — including suretyships (General Law Amendment Act 50 of 1956), antenuptial contracts (Matrimonial Property Act 88 of 1984), and documents requiring commissioning or notarial execution (such as deeds of trust or sworn affidavits) — carry special statutory formalities or require an Advanced Electronic Signature (AES) or commissioner of oaths presence.`;

export function getEctaLegalNotice(appName = 'Lunar Sign', verificationUrl = 'https://lunar-sign.netlify.app/verify'): string {
  return ECTA_LEGAL_NOTICE_TEMPLATE
    .replace(/{app_name}/g, appName)
    .replace(/{verification_url}/g, verificationUrl);
}

export const ECTA_SIGNER_CONSENT_TEXT = `I expressly consent to transact electronically in terms of Section 13(2) of the Electronic Communications and Transactions Act 25 of 2002 (ECTA). I understand and agree that by affixing my electronic signature, I intend to execute and be legally bound by this document.`;
