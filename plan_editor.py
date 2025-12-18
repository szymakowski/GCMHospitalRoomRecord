import cv2
from matplotlib import pyplot as plt

image = cv2.imread("static/img/C3_0.png")
gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

amount = 1.5
gauss_sigma = 1       # wygładzanie
thresh_val = 200      # threshold intensywność linii

blurred = cv2.GaussianBlur(gray, (0,0), gauss_sigma)
sharpen = cv2.addWeighted(gray, 1.0 + amount, blurred, -amount, 0)

_, binary = cv2.threshold(sharpen, thresh_val, 255, cv2.THRESH_BINARY)

# czyszczenie szumów
kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3,3))
cleaned = cv2.morphologyEx(sharpen, cv2.MORPH_OPEN, kernel, iterations=1)


cv2.imwrite("static/maps/C3_0.png", cleaned)

plt.figure(figsize=(12,6))
plt.subplot(121), plt.imshow(gray, cmap='gray'), plt.title("Oryginał")
plt.subplot(122), plt.imshow(cleaned, cmap='gray'), plt.title("Rezultat")
plt.show()
