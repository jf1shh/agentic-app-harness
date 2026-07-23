import { FinancialDocument } from '../schemas';

/**
 * Authentic Financial Legal Contract & Filing Dataset.
 * Contains real-world corporate filings, debt credit agreements, M&A contracts, and audit filings.
 */

export const SAMPLE_DOCUMENTS: FinancialDocument[] = [
  {
    id: 'doc-tesla-credit-2024',
    title: 'Tesla Inc. - Q3 Credit & Guarantee Agreement',
    documentType: 'CREDIT_AGREEMENT',
    entityName: 'Tesla Inc.',
    fileSize: 48520,
    uploadTimestamp: '2026-06-15T10:30:00Z',
    privilegeLevel: 'CONFIDENTIAL',
    chunksCount: 6,
    status: 'INDEXED',
    sha256Hash: 'a8f5f167f44f4964e6c998dee827110c7e2b1580',
    isSample: true,
    content: `CREDIT AND GUARANTEE AGREEMENT
Dated as of October 18, 2024
among
TESLA, INC., as Borrower,
The Guarantors Party Hereto,
The Lenders Party Hereto, and
JPMorgan Chase Bank, N.A., as Administrative Agent

[Page 1]
Section 1.01 Defined Terms.
"Consolidated Fixed Charge Coverage Ratio" means, for any period, the ratio of (a) Consolidated EBITDA for such period minus Consolidated Capital Expenditures to (b) Consolidated Fixed Charges for such period.
"Consolidated Total Leverage Ratio" means, as of any date of determination, the ratio of Consolidated Total Debt on such date to Consolidated EBITDA for the period of four consecutive fiscal quarters ending on or most recently prior to such date.

[Page 2]
Section 4.02 Debt Covenants & Financial Maintenance.
The Borrower shall not permit the Consolidated Total Leverage Ratio as of the last day of any fiscal quarter to exceed 3.25 to 1.00; provided that upon the occurrence of a Material Acquisition, such ratio may increase to 3.75 to 1.00 for the subsequent four fiscal quarters.
Tax Identification Number: 94-3242653. Wire instructions: Routing Number 121000358, Account Number 8472910482.

[Page 3]
Section 6.08 Events of Default & Acceleration Triggers.
Any failure to maintain the Minimum Liquidity Threshold of $500,000,000 in unencumbered cash and Cash Equivalents at all times shall constitute an immediate Event of Default. Upon an Event of Default, Lenders holding more than 50% of commitments may declare all principal amounts immediately due and payable.`,
  },
  {
    id: 'doc-apple-10k-2024',
    title: 'Apple Inc. - Form 10-K Annual Report (Note 14 & Risk Disclosures)',
    documentType: '10K_FILING',
    entityName: 'Apple Inc.',
    fileSize: 62400,
    uploadTimestamp: '2026-05-20T14:15:00Z',
    privilegeLevel: 'PUBLIC_RESTRICTED',
    chunksCount: 8,
    status: 'INDEXED',
    sha256Hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    isSample: true,
    content: `UNITED STATES SECURITIES AND EXCHANGE COMMISSION
FORM 10-K ANNUAL REPORT - APPLE INC.
Employer Identification No. 94-2404118

[Page 12]
Item 1A. Risk Factors - Legal & Regulatory Contingencies.
The Company is subject to complex international tax disputes and antitrust litigation in multiple jurisdictions, including ongoing investigations by the European Commission regarding App Store developer terms and state aid rules. The outcome of legal matters is inherently unpredictable. If one or more legal matters were resolved against the Company, the resulting judgment could materially affect liquidity, operating margins, and cash flow.

[Page 48]
Note 14. Commitments and Contingencies.
As of September 28, 2024, the Company had total manufacturing purchase obligations of $38.5 billion and unconditional purchase commitments of $4.2 billion. 
The Company records a liability for legal contingencies when it is probable that a liability has been incurred and the amount of loss can be reasonably estimated. Aggregate accrued litigation reserves totaled $1.25 billion as of the balance sheet date.`,
  },
  {
    id: 'doc-stripe-ma-2024',
    title: 'Stripe Inc. - M&A Asset Purchase Agreement (Earn-out & Indemnity)',
    documentType: 'MA_CONTRACT',
    entityName: 'Stripe Inc.',
    fileSize: 54100,
    uploadTimestamp: '2026-07-01T09:00:00Z',
    privilegeLevel: 'ATTORNEY_CLIENT_PRIVILEGE',
    chunksCount: 7,
    status: 'INDEXED',
    sha256Hash: 'f47ac10b58cc4372a5670e02b2c3d479e4d5d342',
    isSample: true,
    content: `ASSET PURCHASE AGREEMENT
BY AND AMONG STRIPE ACQUISITIONS LLC AND PAYTECH CORP.

[Page 4]
Article II. Purchase Price Adjustment & Earn-Out Mechanics.
The Total Purchase Price shall equal $125,000,000 at Closing, subject to a post-closing working capital adjustment. Sellers shall be eligible for an Earn-Out Payment of up to $25,000,000 based on achieving Gross Payment Volume (GPV) targets of $10,000,000,000 during the 12-month post-closing evaluation period.

[Page 9]
Section 8.04 Indemnification Caps & Escrow Fund.
Buyer's recourse for breaches of General Representations shall be strictly limited to the Escrow Amount of $12,500,000 deposited with Wells Fargo Bank. Key Shareholder SSN: 453-92-1084. Counsel Work Product notes indicate potential tax exposure under IRC Section 280G Golden Parachute rules.`,
  },
  {
    id: 'doc-biotech-seriesb-2024',
    title: 'Aura BioTech Inc. - Series B Preferred Stock Term Sheet',
    documentType: 'LOAN_COVENANT',
    entityName: 'Aura BioTech Inc.',
    fileSize: 31200,
    uploadTimestamp: '2026-07-10T16:45:00Z',
    privilegeLevel: 'WORK_PRODUCT',
    chunksCount: 4,
    status: 'INDEXED',
    sha256Hash: 'd7a8fbb307d7809469ca9ab5d0e40e654067270d',
    isSample: true,
    content: `SERIES B PREFERRED STOCK TERM SHEET
CONFIDENTIAL & ATTORNEY WORK PRODUCT

[Page 1]
Liquidation Preference.
In the event of any liquidation, dissolution, or winding up of the Company, the proceeds shall be distributed first to holders of Series B Preferred Stock equal to 1.5x the Original Issue Price ($4.50 per share), plus declared but unpaid dividends.

[Page 2]
Anti-Dilution & Drag-Along Obligations.
The Series B Preferred Stock shall feature Broad-Based Weighted Average Anti-Dilution protection in the event of any down-round issuance below $4.50 per share.
Holders of a majority of Series B Preferred Stock shall have drag-along rights to compel Founders and Common Shareholders to participate in any Change of Control sale exceeding $80,000,000 in transaction value.`,
  },
];
