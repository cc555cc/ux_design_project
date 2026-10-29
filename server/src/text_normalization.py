from nltk import data as nltk_data
from nltk.stem import WordNetLemmatizer


_lemmatizer = WordNetLemmatizer()

try:
    nltk_data.find("corpora/wordnet")
    WORDNET_AVAILABLE = True
except LookupError:
    try:
        nltk_data.find("corpora/wordnet.zip")
        WORDNET_AVAILABLE = True
    except LookupError:
        WORDNET_AVAILABLE = False


def lemmatize_word(word):
    if not WORDNET_AVAILABLE:
        return word

    try:
        noun_form = _lemmatizer.lemmatize(word, pos="n")
        verb_form = _lemmatizer.lemmatize(noun_form, pos="v")
        return verb_form
    except LookupError:
        return word


def lemmatize_words(word_list):
    return [lemmatize_word(word) for word in word_list]
