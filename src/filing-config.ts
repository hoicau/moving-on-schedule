type FilingEntry = {
  text: string;
  link: string;
};

export type FilingConfig = {
  icp: FilingEntry;
  publicSecurity: FilingEntry & { icon: string };
};

export const filingConfig: FilingConfig = {
  icp: {
    text: '',
    link: 'https://beian.miit.gov.cn/',
  },
  publicSecurity: {
    text: '',
    link: '',
    icon: '',
  },
};
