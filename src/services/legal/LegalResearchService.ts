import { CaseLaw, Statute } from '../../types/legal';

interface SearchOptions {
  jurisdictions?: string[];
}

/**
 * Lightweight mock implementation of the legal research service.
 * Provides deterministic data so TypeScript consumers can rely on
 * predictable structures during development without a backend.
 */
class LegalResearchService {
  private caseLaw: CaseLaw[];
  private statutes: Statute[];

  constructor() {
    const now = new Date();
    this.caseLaw = [
      {
        id: 'case_mock_1',
        citation: '456 F.Supp.3d 789 (S.D.N.Y. 2023)',
        title: 'Hamilton v. DataShield Corp.',
        court: 'Southern District of New York',
        jurisdiction: 'New York',
        date: new Date(now.getFullYear(), 2, 12),
        judges: ['Hon. Alicia Romero'],
        parties: ['Amanda Hamilton', 'DataShield Corporation'],
        summary:
          'Landmark decision clarifying employer obligations regarding data retention and employee privacy in remote work environments.',
        holdings: [
          'Employers must provide clear notice before monitoring employee devices.',
          'Failure to maintain audit logs can create adverse inference.',
        ],
        procedureHistory: 'Appeal from the New York Privacy Board decision.',
        facts:
          'The plaintiff alleged that company-issued monitoring software collected personal information without explicit consent.',
        reasoning:
          'Court applied a balancing test weighing legitimate business interests against individual privacy expectations.',
        outcome: 'Partial summary judgment for the plaintiff.',
        keyWords: ['privacy', 'employment', 'remote work'],
        shepardization: 'good_law',
        relevanceScore: 0.86,
      },
      {
        id: 'case_mock_2',
        citation: '789 F.3d 123 (9th Cir. 2022)',
        title: 'In re Pacifica Analytics Breach Litigation',
        court: 'Ninth Circuit Court of Appeals',
        jurisdiction: 'US Federal',
        date: new Date(now.getFullYear() - 1, 6, 3),
        judges: ['Hon. Lee Patterson', 'Hon. Maria Sanchez', 'Hon. Kelly Jordan'],
        parties: ['Pacifica Analytics, Inc.', 'Numerous Plaintiffs'],
        summary:
          'Class action addressing contractual liability and damages following a large-scale analytics platform breach.',
        holdings: [
          'Breach notification clauses are enforceable when explicitly negotiated.',
          'Limitation-of-liability clauses must be prominently disclosed to be effective.',
        ],
        procedureHistory: 'Appeal from the Northern District of California.',
        facts:
          'Customers alleged that the company failed to patch a known vulnerability, leading to exposure of confidential datasets.',
        reasoning:
          'Court emphasized the importance of commercially reasonable security measures and transparent client communication.',
        outcome: 'Affirmed in part, reversed in part, and remanded.',
        keyWords: ['data breach', 'contract', 'liability'],
        westlawKey: '2022 WL 1234567',
        relevanceScore: 0.81,
      },
    ];

    this.statutes = [
      {
        id: 'statute_mock_1',
        citation: 'Cal. Civ. Code § 1798.100',
        title: 'California Consumer Privacy Act – Data Rights',
        jurisdiction: 'California',
        section: '1798.100',
        text:
          'Provides California residents with rights to know, delete, and opt-out of the sale of personal information collected by businesses.',
        effectiveDate: new Date(2020, 0, 1),
        amendmentHistory: [
          {
            date: new Date(2023, 6, 1),
            description: 'Updated to include additional disclosure obligations for service providers.',
            changedText: 'Added explicit requirements for employee data handling.',
            reason: 'Privacy Rights Expansion Act updates.',
          },
        ],
        relatedStatutes: ['Cal. Civ. Code § 1798.150'],
        annotations: [
          {
            type: 'interpretation',
            content: 'Courts interpret disclosure obligations liberally in favour of consumers.',
            source: 'California Attorney General Guidance',
            date: new Date(2023, 6, 15),
          },
        ],
      },
      {
        id: 'statute_mock_2',
        citation: '15 U.S.C. § 6801',
        title: 'Gramm-Leach-Bliley Act – Protection of Nonpublic Personal Information',
        jurisdiction: 'US Federal',
        section: '6801',
        text:
          'Requires financial institutions to protect the security and confidentiality of their customers’ nonpublic personal information.',
        effectiveDate: new Date(1999, 10, 12),
        amendmentHistory: [],
        relatedStatutes: ['15 U.S.C. § 6809'],
        annotations: [
          {
            type: 'regulation',
            content: 'See FTC Safeguards Rule for implementing regulations.',
            source: 'Federal Trade Commission',
            date: new Date(2021, 11, 9),
          },
        ],
      },
    ];
  }

  async searchCaseLaw(query: string, options: SearchOptions = {}): Promise<CaseLaw[]> {
    const keyword = query.trim().toLowerCase();
    const jurisdictions = options.jurisdictions?.map((j) => j.toLowerCase());

    return this.caseLaw.filter((caseItem) => {
      const matchesQuery =
        !keyword ||
        caseItem.title.toLowerCase().includes(keyword) ||
        caseItem.summary.toLowerCase().includes(keyword) ||
        caseItem.keyWords.some((word) => word.toLowerCase().includes(keyword));
      const matchesJurisdiction =
        !jurisdictions || jurisdictions.length === 0 || jurisdictions.includes(caseItem.jurisdiction.toLowerCase());
      return matchesQuery && matchesJurisdiction;
    });
  }

  async searchStatutes(query: string, options: SearchOptions = {}): Promise<Statute[]> {
    const keyword = query.trim().toLowerCase();
    const jurisdictions = options.jurisdictions?.map((j) => j.toLowerCase());

    return this.statutes.filter((statute) => {
      const matchesQuery =
        !keyword ||
        statute.title.toLowerCase().includes(keyword) ||
        statute.text.toLowerCase().includes(keyword) ||
        statute.citation.toLowerCase().includes(keyword);
      const matchesJurisdiction =
        !jurisdictions || jurisdictions.length === 0 || jurisdictions.includes(statute.jurisdiction.toLowerCase());
      return matchesQuery && matchesJurisdiction;
    });
  }

  async getCaseById(id: string): Promise<CaseLaw | null> {
    return this.caseLaw.find((item) => item.id === id) || null;
  }
}

export default LegalResearchService;
