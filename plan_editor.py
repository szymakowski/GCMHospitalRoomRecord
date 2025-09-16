import cv2
from matplotlib import pyplot as plt

# Wczytaj obraz
image = cv2.imread("static/img/C3-1.png")
gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
cv2.imwrite("plan_grey.png", gray)


# Progowanie - zostają czarne linie, reszta biała
# (tutaj 200 - czyli wszystko ciemniejsze niż 200 = czarne)
_, binary = cv2.threshold(gray, 200, 255, cv2.THRESH_BINARY)

# Opcjonalne czyszczenie szumów
kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3,3))
cleaned = cv2.morphologyEx(binary, cv2.MORPH_OPEN, kernel, iterations=1)

# Wyświetlenie
plt.figure(figsize=(12,6))
plt.subplot(121), plt.imshow(gray, cmap='gray'), plt.title("Oryginał")
plt.subplot(122), plt.imshow(cleaned, cmap='gray'), plt.title("Plan: czarne linie na białym tle")
plt.show()
