import requests
from bs4 import BeautifulSoup

lst = []
def lists():
    html_text = requests.get("https://en.wikipedia.org/wiki/List_of_Tamil_films_of_2023").text
    soup = BeautifulSoup(html_text,"lxml")
    tables = soup.find_all("table")
    tbody = tables[6].find("tbody")
    rows = tbody.find_all("tr")
    rows.pop(0)
    for row in rows:
        try:
            link = row.find("a")['href']
            lst.append("https://en.wikipedia.org"+link)
        except:
            continue

def disp():

    num = 1

    for i in lst:
        html_text = requests.get(i).text
        soup = BeautifulSoup(html_text,"lxml")
        
        rows = soup.find_all("tr")
        print("\n")
        num += 1

        try:
            movie = soup.find("h1")
            name = movie.find("i")
            print("Movie = ",name.text)
            
            for row in rows:
                try:
                    
                    
                    row_name = row.find("th")
                    row_name = row_name.text
                    if(row_name == "Directed by"):
                        if(row.th.a):
                            row_value = row.a.text
                            print("Direction = ",row_value)
                        else:
                            row_value = row.td.text
                            print("Direction = ",row_value)

                    if(row_name == "Music by"):
                        if(row.th.a):
                            row_value = row.a.text
                            print("Music = ",row_value)
                        else:
                            row_value = row.td.text
                            print("Music = ",row_value)

                    if(row_name == "Cinematography"):
                        if(row.th.a):
                            row_value = row.a.text
                            print("Cinematography = ",row_value)
                        else:
                            row_value = row.td.text
                            print("Cinematography = ",row_value)
                except:
                    continue
                
        except AttributeError:
            continue
lists()
disp()
