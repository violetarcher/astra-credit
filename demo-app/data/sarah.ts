export const sarahData = {
  summary: {
    name: 'Sarah Johnson',
    creditScore: 742,
    scoreRange: 'Good (670–739)',
    scoreDate: '2025-07-01',
    totalAccounts: 3,
    openAccounts: 3,
    paymentHistoryPercent: 98,
    creditUtilization: '24%',
    oldestAccountAge: '8 years',
    hardInquiriesLast12Months: 1,
    publicRecords: 0,
    message:
      'Sarah has a strong credit profile. Her score reflects consistent on-time payments and moderate utilization.',
  },

  creditReport: {
    personalInfo: {
      name: 'Sarah Johnson',
      ssn: 'XXX-XX-4821',
      dob: 'XXXX-XX-09',
      address: '412 Maple Ridge Dr, Austin, TX 78701',
    },
    creditScore: {
      score: 742,
      model: 'FICO Score 8',
      asOf: '2025-07-01',
      factors: [
        'Excellent payment history',
        'Low credit utilization (24%)',
        'Established credit history (8+ years)',
        'One recent hard inquiry (auto refinance, Jun 2024)',
      ],
    },
    accounts: [
      {
        creditor: 'Chase Bank',
        type: 'Revolving — Credit Card',
        product: 'Chase Sapphire Preferred',
        opened: '2017-03-15',
        creditLimit: 8500,
        currentBalance: 2050,
        minimumPayment: 41,
        status: 'Current',
        paymentHistory: '60/60 on time',
      },
      {
        creditor: 'Toyota Financial Services',
        type: 'Installment — Auto Loan',
        product: '2022 Toyota RAV4',
        opened: '2022-08-01',
        originalAmount: 32000,
        currentBalance: 21400,
        monthlyPayment: 598,
        status: 'Current',
        paymentHistory: '34/34 on time',
      },
      {
        creditor: 'Citizens Bank',
        type: 'Installment — Mortgage',
        product: '30-Year Fixed Mortgage',
        opened: '2020-06-01',
        originalAmount: 380000,
        currentBalance: 342150,
        monthlyPayment: 2108,
        status: 'Current',
        paymentHistory: '61/61 on time',
      },
    ],
    inquiries: [
      {
        creditor: 'Toyota Financial Services',
        date: '2024-06-12',
        type: 'Hard',
        purpose: 'Auto loan refinance',
      },
    ],
    publicRecords: [],
  },

  mortgageEligibility: {
    applicant: 'Sarah Johnson',
    analysisDate: '2025-07-16',
    requestedLoanAmount: 450000,
    estimatedPropertyValue: 525000,
    downPayment: 75000,
    financialProfile: {
      grossMonthlyIncome: 8500,
      monthlyDebtObligations: {
        mortgage: 2108,
        autoLoan: 598,
        creditCardMinimum: 41,
        total: 2747,
      },
      debtToIncomeRatio: '32.3%',
      housingExpenseRatio: '19.0%',
      creditScore: 742,
    },
    loanParameters: {
      loanToValue: '85.7%',
      estimatedRate: '6.875%',
      term: '30-year fixed',
      estimatedMonthlyPayment: 2956,
      estimatedPMI: 188,
      totalMonthlyHousingCost: 3144,
    },
    verdict: 'Conditionally Approved',
    verdictDetail:
      'Sarah meets credit score and DTI thresholds for a conventional loan at this amount. ' +
      'LTV of 85.7% requires PMI until 80% LTV is reached (~7 years at current payment schedule). ' +
      'Full approval pending: income verification (W-2s, 2 years tax returns), property appraisal, and title search.',
    nextSteps: [
      'Submit income verification documents',
      'Order property appraisal',
      'Confirm 12-month bank statements for down payment sourcing',
      'Lock rate within 30 days to hold current estimate',
    ],
  },
};
