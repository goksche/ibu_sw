export interface Theme {
  colors: {
    background: {
      primary: string;
      secondary: string;
      card: string;
      accent: string;
    };
    text: {
      primary: string;
      secondary: string;
      disabled: string;
    };
    accent: {
      primary: string;
      success: string;
      warning: string;
      error: string;
      info: string;
    };
    border: {
      standard: string;
      hover: string;
      focus: string;
    };
  };
  borderRadius: {
    button: string;
    input: string;
    card: string;
    badge: string;
    modal: string;
  };
  shadows: {
    card: string;
    buttonHover: string;
  };
  transitions: {
    default: string;
  };
  spacing: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
}


