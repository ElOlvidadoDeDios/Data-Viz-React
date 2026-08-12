from pathlib import Path
import fitz


pdf_path = Path("attached_assets/gestion_administradores-v6.0_1786543948989.pdf")
output_dir = Path(".agents/outputs/powerbi-pdf-pages")
output_dir.mkdir(parents=True, exist_ok=True)

doc = fitz.open(pdf_path)
print(f"pages={doc.page_count}")
for index, page in enumerate(doc):
    pixmap = page.get_pixmap(matrix=fitz.Matrix(1.25, 1.25), alpha=False)
    output_path = output_dir / f"page-{index + 1}.png"
    pixmap.save(output_path)
    text = page.get_text("text").replace("\n", " | ")
    print(f"page={index + 1} size={page.rect.width:.0f}x{page.rect.height:.0f} file={output_path}")
    print(f"text={text[:700]}")