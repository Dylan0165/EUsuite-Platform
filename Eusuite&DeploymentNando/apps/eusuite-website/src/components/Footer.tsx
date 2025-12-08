import { Link } from 'react-router-dom';
import { Cloud, Twitter, Linkedin, Github, Mail } from 'lucide-react';

const footerLinks = {
  product: [
    { name: 'Features', path: '/features' },
    { name: 'Pricing', path: '/pricing' },
    { name: 'Security', path: '/features#security' },
    { name: 'Integrations', path: '/features#integrations' },
  ],
  company: [
    { name: 'About', path: '/about' },
    { name: 'Blog', path: '/blog' },
    { name: 'Careers', path: '/careers' },
    { name: 'Contact', path: '/contact' },
  ],
  legal: [
    { name: 'Privacy Policy', path: '/privacy' },
    { name: 'Terms of Service', path: '/terms' },
    { name: 'Cookie Policy', path: '/cookies' },
    { name: 'GDPR', path: '/gdpr' },
  ],
};

const socialLinks = [
  { name: 'Twitter', icon: Twitter, url: 'https://twitter.com/eusuite' },
  { name: 'LinkedIn', icon: Linkedin, url: 'https://linkedin.com/company/eusuite' },
  { name: 'GitHub', icon: Github, url: 'https://github.com/eusuite' },
  { name: 'Email', icon: Mail, url: 'mailto:info@eusuite.eu' },
];

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
          {/* Logo & Description */}
          <div className="col-span-2">
            <Link to="/" className="flex items-center gap-2">
              <Cloud className="w-8 h-8 text-primary-400" />
              <span className="text-xl font-bold">EUSuite</span>
            </Link>
            <p className="mt-4 text-gray-400 text-sm max-w-xs">
              De complete SaaS-oplossing voor moderne bedrijven. 
              Alles wat je nodig hebt in één platform.
            </p>
            {/* Social Links */}
            <div className="flex gap-4 mt-6">
              {socialLinks.map((social) => (
                <a
                  key={social.name}
                  href={social.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-white transition-colors"
                  aria-label={social.name}
                >
                  <social.icon className="w-5 h-5" />
                </a>
              ))}
            </div>
          </div>

          {/* Product Links */}
          <div>
            <h3 className="font-semibold mb-4">Product</h3>
            <ul className="space-y-2">
              {footerLinks.product.map((link) => (
                <li key={link.path}>
                  <Link
                    to={link.path}
                    className="text-gray-400 hover:text-white text-sm transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company Links */}
          <div>
            <h3 className="font-semibold mb-4">Bedrijf</h3>
            <ul className="space-y-2">
              {footerLinks.company.map((link) => (
                <li key={link.path}>
                  <Link
                    to={link.path}
                    className="text-gray-400 hover:text-white text-sm transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal Links */}
          <div>
            <h3 className="font-semibold mb-4">Juridisch</h3>
            <ul className="space-y-2">
              {footerLinks.legal.map((link) => (
                <li key={link.path}>
                  <Link
                    to={link.path}
                    className="text-gray-400 hover:text-white text-sm transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-gray-800 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-gray-400 text-sm">
            © {new Date().getFullYear()} EUSuite. Alle rechten voorbehouden.
          </p>
          <p className="text-gray-400 text-sm">
            Made with ❤️ in Europe 🇪🇺
          </p>
        </div>
      </div>
    </footer>
  );
}
