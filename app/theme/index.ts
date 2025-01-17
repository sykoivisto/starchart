import { extendTheme, withDefaultColorScheme } from '@chakra-ui/react';
import colors from './colors';
import breakpoints from './breakpoints';

const theme = extendTheme(
  {
    colors,
    breakpoints,
    styles: {
      global: {
        '.domain-form': {
          // InfoIcon
          '.chakra-icon': {
            color: colors.brand_gray[300],
            fontSize: 'xl',
          },
        },
      },
    },
  },
  withDefaultColorScheme({ colorScheme: 'brand' })
);

export default theme;
