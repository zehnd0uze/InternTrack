import { mdToPdf } from 'md-to-pdf';
import fs from 'fs';

async function main() {
  try {
    console.log('Generating PDF manual...');
    const pdf = await mdToPdf(
      { path: 'USER_MANUAL.md' },
      { 
        launch_options: { 
          args: ['--no-sandbox', '--disable-setuid-sandbox'] 
        } 
      }
    );
    fs.writeFileSync('USER_MANUAL.pdf', pdf.content);
    console.log('PDF manual generated successfully as USER_MANUAL.pdf!');
  } catch (error) {
    console.error('Error generating PDF:', error);
    process.exit(1);
  }
}

main();
