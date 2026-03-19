// src/styles/colors.js
import lightOverlay from '../Assets/LightOverlay.png';
import darkOverlay from '../Assets/DarkOverlay.png';

// change when the light mode is
export const lightTheme = {
  background: 'bg-white',
  navbar_background: 'bg-white',
  navbar_text: 'text-black',
  text: 'text-black',
  secondary_text: 'text-[#949BA7]',
  primary: 'text-white',
  secondary: 'text-[#F05454]',
  navbarBackgroundImage: `url(${lightOverlay})`, // Replace with your light theme image path
};

// fixed color scheme for darktheme
export const darkTheme = {
  background: 'bg-black',

  navbar_background: 'bg-[#1B1A23F7]',
  navbar_text: 'text-white',
  text: 'text-white',
  secondary_text: 'text-[#949BA7]',
  primary: 'text-white',
  secondary: 'text-[#F05454]',
  navbarBackgroundImage: `url(${darkOverlay})`, // Replace with your dark theme image path
};
