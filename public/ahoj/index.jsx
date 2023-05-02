import { Main } from "./main.tsx"
import { motion } from "framer-motion"

const index = () => {
    return (
        <>
            <motion.h1 whileHover={{ x: 100 }} >Hello World</motion.h1>
            <Main />
        </>
    )
}
