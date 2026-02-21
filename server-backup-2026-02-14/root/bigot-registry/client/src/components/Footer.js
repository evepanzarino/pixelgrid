import React from 'react';

function Footer() {
  return (
    <footer className="footer">
      <p>&copy; {new Date().getFullYear()} Bigot Registry. All rights reserved.</p>
      <p>A public accountability database.</p>
    </footer>
  );
}

export default Footer;
