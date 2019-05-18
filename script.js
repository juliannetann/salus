// button1 = document.getElementsByClassName("button")

document.addEventListener("DOMContentLoaded",()=>{
    console.log("Loaded")
    let windowWidth = document.body.clientWidth
    let buttons = document.querySelectorAll(".btn.btn-primary.more")
    buttons = Array.from(buttons)
    let cards = document.getElementsByClassName("card")
    cards = Array.from(cards)

    function searchClass(elemArray, className) {
        return elemArray.map( elem => {
            return Array.from(elem.classList).includes(className)
        })
    }

    
    if (windowWidth < 576 ){
        
        buttons.map( button => {
            button.classList.remove("mt-auto")
            button.classList.remove("more")
        })

        cards.map( card => {
            try{
                card.classList.remove("card-1")
                card.classList.remove("card-3")
            } catch (e) {
                console.log(e)
            }
        })

        
        console.log(buttons)
    } else if (windowWidth > 576 && (searchClass(buttons,"more").includes(false) || searchClass(buttons,"mt-auto").includes(false)) ){
        
        
        buttons.map( button => {
            button.classList.add("mt-auto")
            button.classList.add("more")
        })
        
        console.log(buttons)
    }

})
