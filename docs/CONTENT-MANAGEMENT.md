# Content Management Guide

This guide is for SAPA officers and authorized members who manage website content. It covers how to update meetings, newsletters, resources, and other dynamic content.

## Table of Contents

1. [Overview](#overview)
2. [Required Tools](#required-tools)
3. [Managing Meetings](#managing-meetings)
4. [Managing Newsletters](#managing-newsletters)
5. [Managing Resources](#managing-resources)
6. [Managing Glossary Terms](#managing-glossary-terms)
7. [Content Guidelines](#content-guidelines)
8. [Deployment Process](#deployment-process)
9. [Troubleshooting](#troubleshooting)

## Overview

The SAPA website uses JSON files to store dynamic content. This approach:
- Requires no database
- Works with static hosting
- Maintains version history
- Allows easy updates

### File Locations

All content files are in the `data/` directory:
```
data/
├── meetings/
│   └── meetings.json      # Meeting schedule
├── newsletters/
│   └── newsletters.json   # Newsletter metadata
├── members/
│   └── resources.json     # Educational resources
├── glossary/
│   └── glossary.json      # Philatelic terms
└── calendar/
    └── *.ics              # Calendar files
```

## Required Tools

### For Basic Updates
- **Text Editor**: VS Code, Sublime Text, or Notepad++
- **JSON Validator**: jsonlint.com or built-in editor validation
- **Git**: For version control (or GitHub web interface)

### For Advanced Management
- **Node.js**: For running build scripts
- **Image Editor**: For optimizing images
- **PDF Software**: For newsletter preparation

## Managing Meetings

### Meeting Data Structure

The `data/meetings/meetings.json` file contains all meeting information:

```json
{
  "meetings": [
    {
      "id": "2025-01-17",
      "date": "2025-01-17",
      "time": "7:30 PM",
      "title": "First Meeting of 2025",
      "description": "Welcome back! Regular meeting with show and tell.",
      "type": "regular",
      "presenter": "Various Members",
      "topics": ["Show and Tell", "Year Planning"],
      "hasAuction": true
    }
  ]
}
```

### Adding a New Meeting

1. Open `data/meetings/meetings.json`
2. Add a new meeting object to the array:

```json
{
  "id": "2025-02-07",
  "date": "2025-02-07",
  "time": "7:30 PM",
  "title": "Stamp Grading Workshop",
  "description": "Learn professional stamp grading techniques.",
  "type": "special",
  "presenter": "John Smith",
  "topics": ["Grading", "Condition", "Valuation"],
  "hasAuction": false
}
```

3. Fields explained:
   - **id**: Unique identifier (use date format)
   - **date**: Meeting date (YYYY-MM-DD)
   - **time**: Start time
   - **title**: Meeting title
   - **description**: Detailed description
   - **type**: "regular", "special", or "annual"
   - **presenter**: Speaker name(s)
   - **topics**: Array of topics covered
   - **hasAuction**: Boolean for auction status

### Creating Calendar Files

For each meeting, create an ICS file:

1. Navigate to `data/calendar/`
2. Create file: `2025-02-07-meeting.ics`
3. Use this template:

```ics
BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//SAPA//Meeting Calendar//EN
BEGIN:VEVENT
UID:2025-02-07@sastamps.org
DTSTAMP:20250207T000000Z
DTSTART:20250208T013000Z
DTEND:20250208T033000Z
SUMMARY:SAPA Meeting - Stamp Grading Workshop
DESCRIPTION:Learn professional stamp grading techniques.
LOCATION:MacArthur Park Lutheran Church, Building 1
END:VEVENT
END:VCALENDAR
```

**Note**: Times are in UTC (add 6 hours for CST)

### Updating Existing Meetings

1. Find the meeting by ID
2. Update relevant fields
3. Save the file
4. Update corresponding ICS file if date/time changed

### Canceling a Meeting

Don't delete! Instead, update:
```json
{
  "id": "2025-02-07",
  "status": "cancelled",
  "title": "CANCELLED - Stamp Grading Workshop",
  "description": "This meeting has been cancelled due to weather."
}
```

## Managing Newsletters

### Newsletter File Structure

The `data/newsletters/newsletters.json` file:

```json
{
  "newsletters": [
    {
      "id": "2025-q1",
      "title": "PHILATEX - First Quarter 2025",
      "date": "2025-03-01",
      "quarter": "Q1",
      "year": 2025,
      "filename": "SAPA-PHILATEX-Q1-2025.pdf",
      "filesize": "2.4 MB",
      "pages": 12,
      "highlights": [
        "President's Message",
        "Upcoming SAPA EXPO",
        "Member Spotlight: Jane Doe"
      ],
      "coverImage": "newsletter-covers/2025-q1-cover.jpg"
    }
  ]
}
```

### Adding a New Newsletter

1. **Prepare the PDF**:
   - Name format: `SAPA-PHILATEX-Q#-YYYY.pdf`
   - Optimize for web (under 5MB)
   - Place in `public/` directory

2. **Add metadata** to newsletters.json:
```json
{
  "id": "2025-q2",
  "title": "PHILATEX - Second Quarter 2025",
  "date": "2025-06-01",
  "quarter": "Q2",
  "year": 2025,
  "filename": "SAPA-PHILATEX-Q2-2025.pdf",
  "filesize": "3.1 MB",
  "pages": 16,
  "highlights": [
    "Summer Activities",
    "Stamp Identification Guide",
    "Treasury Report"
  ],
  "coverImage": "newsletter-covers/2025-q2-cover.jpg"
}
```

3. **Create cover image** (optional):
   - Export first page as image
   - Resize to 400x600px
   - Save as JPG in `images/newsletter-covers/`
   - Optimize with: `npm run optimize:images`

### Newsletter Best Practices

- Keep file size under 5MB
- Use consistent naming convention
- Include searchable text (not scanned images)
- Add meaningful highlights for search
- Archive by year and quarter

## Managing Resources

### Resource Data Structure

The `data/members/resources.json` file:

```json
{
  "resources": [
    {
      "id": "beginners-guide",
      "title": "Beginner's Guide to Stamp Collecting",
      "category": "education",
      "difficulty": "beginner",
      "description": "Complete introduction to philately",
      "content": "Full HTML content here...",
      "author": "SAPA Education Committee",
      "lastUpdated": "2025-01-15",
      "readTime": "10 min",
      "featured": true,
      "tags": ["beginner", "basics", "getting started"]
    }
  ]
}
```

### Adding a New Resource

1. Create resource object:
```json
{
  "id": "stamp-storage-guide",
  "title": "Proper Stamp Storage Methods",
  "category": "preservation",
  "difficulty": "intermediate",
  "description": "Learn how to store and protect your stamps",
  "content": "<h2>Storage Basics</h2><p>Content here...</p>",
  "author": "John Smith",
  "lastUpdated": "2025-02-01",
  "readTime": "15 min",
  "featured": false,
  "tags": ["storage", "preservation", "albums"]
}
```

2. Categories available:
   - `education` - Learning materials
   - `reference` - Quick guides
   - `preservation` - Care and storage
   - `identification` - Stamp ID help
   - `valuation` - Pricing guides

3. Difficulty levels:
   - `beginner`
   - `intermediate`
   - `advanced`

### Writing Resource Content

Use HTML for formatting:
```html
<h2>Introduction</h2>
<p>This guide covers the basics of stamp storage...</p>

<h3>Storage Options</h3>
<ul>
  <li><strong>Albums</strong>: Traditional storage method</li>
  <li><strong>Stock Books</strong>: For temporary storage</li>
  <li><strong>Glassines</strong>: Individual protection</li>
</ul>

<h3>Environmental Factors</h3>
<p>Keep stamps away from:</p>
<ol>
  <li>Direct sunlight</li>
  <li>High humidity</li>
  <li>Temperature extremes</li>
</ol>
```

### External Resources

For linking to external sites:
```json
{
  "id": "aps-website",
  "title": "American Philatelic Society",
  "category": "external",
  "type": "link",
  "url": "https://stamps.org",
  "description": "National stamp collecting organization"
}
```

## Managing Glossary Terms

### Glossary Structure

The `data/glossary/glossary.json` file:

```json
{
  "terms": [
    {
      "id": "perforation",
      "term": "Perforation",
      "definition": "The rows of holes punched between stamps to make them easy to separate.",
      "alternateTerms": ["perfs", "perf"],
      "relatedTerms": ["gauge", "imperforate"],
      "category": "technical"
    }
  ]
}
```

### Adding Glossary Terms

1. Create term object:
```json
{
  "id": "watermark",
  "term": "Watermark",
  "definition": "A design or pattern impressed into paper during manufacture, visible when held to light.",
  "alternateTerms": ["wmk"],
  "relatedTerms": ["paper", "printing"],
  "category": "technical"
}
```

2. Categories:
   - `technical` - Production terms
   - `collecting` - Hobby terms
   - `condition` - Grading terms
   - `postal` - Mail-related terms

### Glossary Guidelines

- Keep definitions concise
- Include common abbreviations
- Cross-reference related terms
- Use plain language
- Add examples when helpful

## Content Guidelines

### Writing Style

- **Tone**: Friendly, educational, professional
- **Audience**: Both beginners and experienced collectors
- **Length**: Concise but complete
- **Language**: American English

### SEO Considerations

- Use descriptive titles
- Include relevant keywords naturally
- Write meaningful descriptions
- Add meta information where applicable

### Accessibility

- Use proper heading hierarchy
- Include alt text for images
- Ensure sufficient contrast
- Write descriptive link text

### Images

- **Format**: WebP preferred, PNG/JPG acceptable
- **Size**: Optimize for web (< 200KB)
- **Dimensions**: Responsive-friendly
- **Naming**: Descriptive, lowercase, hyphens

## Deployment Process

### Using Git (Recommended)

1. **Clone repository**:
   ```bash
   git clone https://github.com/arlenagreer/arlenagreer.github.io.git
   cd sastamps
   ```

2. **Create branch**:
   ```bash
   git checkout -b content-update-2025-02
   ```

3. **Make changes** to JSON files

4. **Test locally**:
   ```bash
   npm install
   npm start
   # Visit http://localhost:3000
   ```

5. **Commit changes**:
   ```bash
   git add data/
   git commit -m "content: Add February 2025 meeting and newsletter"
   ```

6. **Push and create PR**:
   ```bash
   git push origin content-update-2025-02
   ```

7. **Create Pull Request** on GitHub

### Using GitHub Web Interface

1. Navigate to the file on GitHub
2. Click the pencil icon to edit
3. Make changes in the editor
4. Preview changes
5. Commit with descriptive message
6. Create pull request

### Deployment Timeline

- Changes merge to `main` branch
- GitHub Actions runs tests
- If tests pass, deploys automatically
- Changes live in ~5 minutes

## Troubleshooting

### JSON Validation Errors

**Problem**: "Unexpected token" error
**Solution**: 
- Check for missing commas
- Ensure proper quotes (use double quotes)
- Validate at jsonlint.com

**Problem**: "Duplicate key" error
**Solution**:
- Ensure all IDs are unique
- Check for copy-paste errors

### Content Not Showing

**Problem**: New content doesn't appear
**Solutions**:
1. Clear browser cache (Ctrl+Shift+R)
2. Check JSON is valid
3. Ensure file was saved
4. Verify deployment completed

### Image Issues

**Problem**: Images not loading
**Solutions**:
1. Check file path is correct
2. Ensure image is in repository
3. Verify filename case (Linux is case-sensitive)
4. Check image was optimized

### Calendar Issues

**Problem**: Calendar events show wrong time
**Solution**: Remember to account for timezone (CST/CDT)

### PDF Issues

**Problem**: Newsletter PDF won't open
**Solutions**:
1. Verify file exists in `public/`
2. Check filename matches JSON
3. Ensure PDF isn't corrupted
4. Verify file permissions

## Best Practices Summary

1. **Always validate JSON** before committing
2. **Test locally** when possible
3. **Use descriptive commit messages**
4. **Keep backups** of content files
5. **Optimize images and PDFs**
6. **Update regularly** - don't batch too many changes
7. **Document special cases** in commit messages

## Getting Help

- **Technical Issues**: Open GitHub issue
- **Content Questions**: Email webmaster
- **Urgent Updates**: Contact via phone
- **Training**: Available at meetings

---

**Remember**: All content changes are version controlled. Don't be afraid to make updates - we can always revert if needed!