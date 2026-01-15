#!/usr/bin/env python3
"""
Add rounded corners to favicon images
"""
import sys
from PIL import Image, ImageDraw
import os

def add_rounded_corners(input_path, output_path, corner_radius=50):
    """
    Add rounded corners to an image
    
    Args:
        input_path: Path to input image
        output_path: Path to save output image
        corner_radius: Radius of rounded corners (default: 50)
    """
    # Open the image
    img = Image.open(input_path).convert("RGBA")
    width, height = img.size
    
    # Create a mask with rounded corners
    mask = Image.new('L', (width, height), 0)
    draw = ImageDraw.Draw(mask)
    
    # Draw rounded rectangle
    draw.rounded_rectangle(
        [(0, 0), (width, height)],
        radius=corner_radius,
        fill=255
    )
    
    # Apply the mask
    output = Image.new('RGBA', (width, height), (0, 0, 0, 0))
    output.paste(img, (0, 0))
    output.putalpha(mask)
    
    # Save the result
    output.save(output_path, 'PNG', optimize=True)
    print(f"✓ Created {output_path} with rounded corners (radius: {corner_radius})")

if __name__ == "__main__":
    # Default corner radius (adjust based on image size)
    # For 1563x1563 image, using 300 for very rounded corners
    corner_radius = 300
    
    input_file = "DineLine favicon.png"
    
    if not os.path.exists(input_file):
        print(f"Error: {input_file} not found")
        sys.exit(1)
    
    # Process all favicon locations
    outputs = [
        ("app/icon.png", corner_radius),
        ("app/favicon.ico", corner_radius),
        ("public/icon.png", corner_radius),
        ("public/favicon.ico", corner_radius),
    ]
    
    try:
        for output_path, radius in outputs:
            add_rounded_corners(input_file, output_path, radius)
        print("\n✓ All favicon files updated with smooth rounded corners!")
    except ImportError:
        print("Error: PIL/Pillow not installed. Install with: pip install Pillow")
        sys.exit(1)
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)

